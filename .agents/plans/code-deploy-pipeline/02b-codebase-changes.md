# Codebase Changes: Code Deploy Pipeline

- Status: In Review
- Slug: `code-deploy-pipeline`
- Linked docs: `./01-overview.md` · `./02-engineering-doc.md`
- Purpose: file-by-file change inventory with the design reasoning (DDD /
  SOLID / DRY) and the failure modes each design decision defuses. **No code
  in this doc** — signatures and shapes only.
- Author (agent/model + date): kimi-k3 / 2026-07-31
- Date: 2026-07-31

## 0. How the principles map to this design

| Principle | Where it shows up |
|---|---|
| DDD — aggregate owns invariants | All status transitions live in `domain/app` methods; nothing outside the aggregate mutates `Status`. The workflow never writes DB columns directly — it calls application command handlers. |
| DDD — single writer | The only writers of `apps` rows are `application/app` command handlers (via UoW). Activities, HTTP handlers, and the workflow all go through them. Prevents the "workflow and API race to update status" class of bug. |
| SOLID-D — depend on abstractions | Workflow activities depend on `internal/ports` interfaces (`ArchiveStore`, `ImageBuilder`, `ContainerProvider`, `Orchestrator`), never on S3/buildah/k3s/go-workflows types. Vendors are swappable (this is what let us change Kaniko→BuildKit→Buildah in planning with zero design churn). |
| SOLID-I — small interfaces | Three narrow ports instead of one `Infra` god-interface; each adapter implements exactly one; tests mock exactly one. |
| SOLID-S — one reason to change | `builder/buildah` changes only when the build tool changes; `storage/s3` only when object storage changes; `adapters/workflow` only when orchestration changes. |
| DRY | One k8s naming/label convention module (used by provider + cleanup + status); one error-sanitization helper (used by every activity before persisting `error_message`); one slug generator (domain service); shared size-capped extraction (validation reuses the existing, fixed `extractTarball`). |

## 1. Domain layer — `internal/domain/app/`

Pure Go. No new imports (no gorm/echo/temporal/sdk types — layering law).

### `app.go` (modify)
- New fields on `App`: `Slug string`, `Port int32`, `ArchiveKey string`,
  `FailedStep string` (gorm column tags only, per repo convention).
- Add `StatusQueued Status = "queued"`; update `validTransitions`:
  - `created → {queued, destroyed}` (was `created → building`): upload happens
    in `created`; only `QueueDeploy` may advance.
  - `queued → {building, failed, destroyed}`
  - `failed → {queued, destroyed}` — **new: retry path**.
  - Everything else unchanged.
- New methods: `Queue(archiveKey, slug string, port int32) error`,
  extend `MarkFailed` to also set `FailedStep`. Each transition method is the
  only place a transition is legal (invariant enforcement stays in the
  aggregate — DDD).
- New domain events: `AppQueued`, `AppRetried` (outbox consumers may want
  them later; emitted through existing UoW `SaveAndPublish`).

### `errors.go` (modify)
- Add sentinels: `ErrNoDockerfile`, `ErrNoWebPort`, `ErrArchiveMissing`,
  `ErrDeployInProgress`, `ErrQuotaExceeded`, `ErrBuildFailed`.
- Rule (existing convention): sentinels compared with `errors.Is`;
  user-facing sentinels double as the non-retryable signal for the workflow.

### `slug.go` (new)
- Domain service: `NewSlug(name string, id uuid.UUID) string` →
  `<sanitized-name>-<shortid>`, lowercase alnum + dash, max 48 chars (DNS
  label ≤ 63, leaves room for domain suffix). One place = DRY; DNS rules are
  a domain concern (the slug *is* the subdomain).

## 2. Application layer

### `internal/application/app/` (modify)
- `commands.go`: add `QueueDeployCommand{ID, ArchiveKey, Slug, Port, Runtime}`,
  `RetryDeployCommand{ID}`.
- `command_handler.go`: add `HandleQueueDeploy` (loads aggregate → `Queue()`
  → UoW save), `HandleRetryDeploy` (validates `failed → queued`, clears
  `FailedStep`/`ErrorMessage`, UoW save). Quota check
  (`max_running_per_user`) lives in `HandleCreate` — repo count query, mapped
  to `ErrQuotaExceeded`.
- `queries.go`/`query_handler.go`: unchanged (response DTO gains fields at
  the HTTP edge, not here).

### `internal/application/deploy/` (rewrite `pipeline.go` → `service.go`)
`deploy.Service` is the orchestration **façade** the HTTP layer talks to. It
owns no infra logic — it composes ports (SOLID-D). Methods:

- `CreateUpload(ctx, cmd{OwnerEmail, Name, Port, Runtime}) → {App, UploadURL, ExpiresAt}`
  — validates quota → creates aggregate (`created`) via command handler →
  `ArchiveStore.PresignedPutURL(apps/<id>/src.tar.gz)`.
- `StartDeploy(ctx, id)` — `ArchiveStore.Head` (missing → `ErrArchiveMissing`
  → 422) → mint slug (one regen retry on unique violation) →
  `HandleQueueDeploy` → `Orchestrator.StartDeployment` (already-running →
  `ErrDeployInProgress` → 409).
- `Retry(ctx, id)` — `HandleRetryDeploy` → `Orchestrator.StartDeployment`.
- `Destroy(ctx, id)` — `Orchestrator.CancelDeployment` (best-effort) →
  `ContainerProvider.Destroy` → `ArchiveStore.Delete` → `HandleDestroy`.

The old `Pipeline` (host-side nerdctl build, local-disk copy, fire-and-forget
goroutine) is **deleted**, but its `extractTarball` (with the zip-slip guard)
moves to `internal/application/deploy/archive.go` and is reused by the
`ValidateArchive` activity — DRY, and the traversal fix is preserved.

## 3. Ports — `internal/ports/`

All new files carry `//go:generate mockgen` directives. These are the
**serial pre-phase** deliverable — everything else builds against them.

### `archivestore.go` (new)
`ArchiveStore`: `PresignedPutURL(ctx, key, ttl)`, `PresignedGetURL(ctx, key, ttl)`,
`Head(ctx, key) (size int64, ok bool, err error)`, `Delete(ctx, key)`.
Design note: **PUT presigns cannot enforce size limits** — see problem P3.

### `imagebuilder.go` (new)
`ImageBuilder.Build(ctx, BuildSpec) error`; `BuildSpec{AppID, ContextURL,
ImageRef, RegistryAuth, Timeout, MaxLogTail}`. Contract: returns
`fmt.Errorf("...: %w", app.ErrBuildFailed)` for user build failures (trimmed
log tail attached via a typed detail), any other error = infra/transient.
`RegistryAuth` is a value type with a `String()` that redacts — slog can
never print it (DRY secret hygiene).

### `orchestrator.go` (new)
`Orchestrator`: `StartDeployment(ctx, DeploymentInput) error`,
`CancelDeployment(ctx, appID string) error`. `DeploymentInput{AppID,
ArchiveKey, Slug, PortOverride, Runtime}` — plain struct, serializable
(go-workflows requirement), no context, no pointers to aggregates.

### `provider.go` (modify)
Add `WaitHealthy(ctx, name string, port int32, timeout time.Duration) error`
and `EnsurePullSecret(ctx, namespace, name string, creds RegistryAuth) error`
to `ContainerProvider`. Compile-time assertion in the k3s adapter guarantees
it keeps satisfying the interface.

## 4. Adapters — `internal/adapters/`

### `storage/s3/` (new) — `ArchiveStore`
minio-go v7 client; presign PUT/GET; `Head` via `StatObject` (maps "not
found" → `ok=false`, everything else wrapped). Config-driven endpoint
(empty = AWS). Compile-time guard `var _ ports.ArchiveStore = (*Store)(nil)`.

### `builder/buildah/` (new) — `ImageBuilder`
Runs on the infra host (same box as the server binary in v1). `Build`:
1. `os.MkdirTemp` per build; size-capped download of `ContextURL`
   (`io.LimitReader` + content-length check → `ErrArchiveMissing` /
   `ErrQuotaExceeded`-class errors).
2. Extract with the shared `extractTarball` (traversal-guarded).
3. `exec.CommandContext(ctx, "buildah", "build", "--layers", "-t", ref, dir)`
   — ctx carries `Timeout`; capture combined output ring-buffer of last N
   lines (bounded memory, feeds the error tail).
4. `buildah push --creds user:pass ref` (creds passed via env, **never**
   argv — argv is visible in `ps`; see P6).
5. Exit non-zero → `ErrBuildFailed` + tail. Context deadline → infra error
   (retryable).
Cleanup `defer os.RemoveAll` always runs, including panics.

### `workflow/` (new) — go-workflows adapter
- `orchestrator.go` — implements `ports.Orchestrator` via
  `client.CreateWorkflowInstance` with `InstanceID = appID`
  (idempotency for free; backend's unique constraint turns duplicate starts
  into `ErrDeployInProgress`).
- `deployment_workflow.go` — `DeploymentWorkflow`: thin, deterministic
  sequencing only (go-workflows determinism rules: no map iteration, no
  `time.Now`, no side effects). **All logic lives in activities** — the
  workflow is a score, not a musician. Compensation: on activity error, run
  `CleanupPartial` + `MarkFailed` in a disconnected context so cancellation
  doesn't skip cleanup.
- `activities.go` — one function per step: `ValidateArchive`,
  `BuildImage`, `ResolvePort`, `DeployRuntime`, `WaitHealthy`, `Finalize`,
  `CleanupPartial`, `MarkFailed`. Each activity: resolves its ports from a
  constructor-injected `ActivityDeps` struct (manual DI, per composition-root
  convention), does I/O with ctx, heartbeats long polls.
- `worker.go` — `StartWorker(ctx, backend, deps)`: registers
  workflow+activities, started from `main.go` when
  `deploy.worker_embedded: true`.

### `provider/k3s/` (modify)
- `Deploy`: PodSpec gains `Port int32` (already there), `RuntimeClass string`,
  `ImagePullSecret string`; pod env gets `PORT`; container resources from
  config; `runtimeClassName` from input (default kata).
- `WaitHealthy` (new): poll pod Ready condition (watch/informers overkill —
  simple poll with `health_interval_s`), then HTTP GET against the ClusterIP
  service; any status < 500 = healthy; exhausted budget → `ErrNoWebPort`.
- `EnsurePullSecret` (new): create-or-update the docker-registry secret from
  zot creds (idempotent, same pattern as existing Service/Ingress upserts).
- `templates.go`: extract name/label conventions into one `naming.go`
  (`AppLabels(appID)`, `ResourceName(appID)`) used by Deploy/Destroy/Status/
  WaitHealthy — currently name strings are repeated (DRY fix; also what makes
  `CleanupPartial` reliably find partial resources).

### `http/web/v1/app_handler.go` (modify) + `app_dto.go` (new)
- `POST /` — JSON body (no more multipart): `{name, port?, runtime?}` → 201
  `{id, slug, upload_url, upload_expires_at}`.
- `POST /:id/deploy`, `POST /:id/retry`, `POST /:id/upload-url` (refresh
  expired presign), `GET /:id` (gains `slug, port, failed_step`), `DELETE /:id`.
- Error mapping table (one helper — DRY): `ErrArchiveMissing`→422,
  `ErrDeployInProgress`→409, `ErrQuotaExceeded`→429, `ErrAppNotFound`→404,
  validation→400, else 500. Ownership check first (ScopeChecker) → 404.
- Swagger godoc on each route; `crank swag` at the end.

## 5. Config — `internal/config/config.go` + `configs/config.yaml`

Extend (markers respected; secrets only via `env:` tags):
- `DeployConfig` += `WorkerEmbedded bool`, `Engine string`
  (`workflow|local`), `WorkflowTimeoutS`, `HealthIntervalS`,
  `MaxRunningPerUser`, `MaxArchiveSizeMB` (rename of `max_tarball_size_mb` —
  keep old key as deprecated alias one release).
- New `WorkflowsConfig{Schema string}` (reuses `database.dsn`).
- New `S3Config{Endpoint, Region, Bucket, AccessKey, SecretKey env, UploadPresignTTL, BuildPresignTTL}`.
- New `RegistryConfig{URL, Username, Password env, StorageBucket}`.
- New `BuildahConfig{Binary, RunUser, StorageRoot, TimeoutS}`.
- `K3sConfig` += `FirecrackerRuntimeClass`, `RegistryPullSecret`; drop
  `RegistryAddr` (superseded by `registry.url`) with deprecated alias.
- `setDefaults` updated for every key (defaults must make dev runnable:
  `engine=local` skips all external deps).

## 6. Persistence

- `db/migrations/20260731120000_add_deploy_pipeline_fields.up.sql` / `.down.sql`
  (sequence reserved — after `...140003`): new columns + partial unique index
  `apps_slug_key ... WHERE slug <> ''`. Nullable/defaulted columns →
  zero-downtime against existing rows.
- go-workflows Postgres backend owns its own tables in schema `workflows`
  (created by the backend constructor; **never** hand-edit, excluded from our
  migrations; documented for DBAs).
- GORM repo (`persistence/gorm/app_repository.go`): detect unique-violation
  on `apps_slug_key` → map to a domain `ErrSlugConflict` the service retries
  once. No other repo changes — the aggregate already round-trips.

## 7. Composition root & registry (serial post-phase only)

- `cmd/server/main.go`: construct S3 store, buildah builder, workflow backend
  (`postgres.NewPostgresBackend(cfg.Database.DSN, schema)`), `ActivityDeps`,
  orchestrator, `deploy.Service`; start embedded worker goroutine when
  `WorkerEmbedded`; graceful shutdown order: stop accepting HTTP → cancel
  worker ctx → backend close (in-flight activities get ctx cancel; workflow
  history survives in Postgres → resume on restart).
- `v1/routes.go`: new endpoints registered on `appGroup`; `MountConfig`
  unchanged shape (AppHandler gains the service, not new handler fields) —
  respects the `crank:http-*` splice markers.

## 8. Problems anticipated, and the design that defuses them

| # | Problem | Design solution |
|---|---|---|
| P1 | **Dual writers** — workflow and API both update `apps` → lost updates/races | Single-writer rule: only command handlers write; activities call handlers; workflow code never touches the repo. |
| P2 | **Worker crash mid-build** → status stuck in `building` forever | Durable workflow history (Postgres): on restart the activity retries per policy. Activities are idempotent (k8s upserts; buildah build is restartable — same tag overwritten). `failed_step` always set before giving up. |
| P3 | **Presigned PUT can't enforce size limits** → user uploads 50 GB | Defense in depth: (a) presign via POST policy with `content-length-range` where the S3 implementation supports it (MinIO/AWS do); (b) `ValidateArchive` HEADs the object and rejects > `max_archive_size_mb` *before* downloading; (c) build download uses `io.LimitReader`. |
| P4 | **Duplicate deploy clicks / retry spam** → two builds of the same app race | Workflow `InstanceID = appID`; backend unique constraint → second start returns `ErrDeployInProgress` → HTTP 409. State machine rejects `queued → queued`. |
| P5 | **Error messages leak internals** (S3 query params, host paths, registry IPs) to users | One `sanitizeUserError(err)` helper (application layer): maps sentinel → canned message + safe detail; strips URLs/tokens via regex; everything unparsed → generic "build failed, check your Dockerfile". Used by every activity before `MarkFailed`. |
| P6 | **Registry creds exposure** via `ps`/logs when shelling to buildah | Creds passed through the subprocess **environment**, never argv; `RegistryAuth.String()` redacts; slog never logs `BuildSpec` wholesale (log fields explicitly). |
| P7 | **go-workflows determinism violations** → workflow replay panics | Workflow function is sequencing-only; no maps/time/random/IO in workflow code; everything in activities. `analyzer` package from go-workflows runs in CI (`go vet`-style check). |
| P8 | **Redeploying the binary while workflows are in flight** → history/code mismatch | v1: workflows are short (≤ 30 min) — deploys drain (`worker_embedded` stops taking new instances, waits for in-flight, bounded). Documented; workflow versioning strategy is a follow-up. |
| P9 | **Slug collision** (two apps named "demo") | Suffix includes shortid → collision probability ~0; DB unique index as backstop; one regen retry on `ErrSlugConflict`, then 500 (loud, not silent wrong-URL). |
| P10 | **Cleanup ordering** — deleting namespace resources while a build still pushes | Compensation runs in reverse order: cancel build first (ctx cancel kills the subprocess), then k8s runtime resources, then (on destroy only) S3 objects. Each step idempotent and best-effort with error aggregation. |
| P11 | **App binds 127.0.0.1 / ignores PORT** → health check never passes | Health budget expires → `ErrNoWebPort` with a *specific* canned message ("no web port detected; bind 0.0.0.0 and honor $PORT"). Better a precise error than a generic timeout. |
| P12 | **Timeout incoherence** — workflow timeout < sum of activity timeouts → confusing cancels | Timeouts derived from one config block at workflow construction; validated at startup (`workflow_timeout_s > build_timeout_s + deploy_timeout_s` → fail fast on boot). |
| P13 | **Zot/S3 eventually-consistent reads** right after push (manifest not visible) | `ResolvePort` reads image config with 3× backoff retry (infra-retryable), not one-shot. |
| P14 | **Local dev without cluster/S3** → feature un-runnable | `deploy.engine: local` keeps a stripped legacy path (no workflow, simulated provider) so `crank run` works with zero external deps. Defaults point there. |

## 9. Explicit non-changes (guardrails)

- No changes to `auth`, `sharelink`, `user` verticals (JWT middleware reused as-is).
- No edits to go-workflows' `workflows` schema, ever.
- No log streaming endpoints, no websockets/SSE (v1 contract).
- `crank:http-*` / `crank:config-*` markers preserved — future `crank make`
  generators must keep working.

## 10. Review

- Reviewer comments:
- Resolution / changes made:
- Approval: [ ] Approved by user (date)
