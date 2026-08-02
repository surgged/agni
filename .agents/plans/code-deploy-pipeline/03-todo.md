# Todo Tracker: Code Deploy Pipeline

- Status: Not started
- Slug: `code-deploy-pipeline`
- Linked engineering doc: `./02-engineering-doc.md` · `./02b-codebase-changes.md`
- Last updated: 2026-07-31

Derived from the Phase 2 Execution Strategy (interface-first). Update
continuously during implementation. Statuses: `todo` | `in-progress` |
`done` | `blocked`.

## Task Board

| # | Task | Owner (agent) | Write scope | Status | Depends on | Link (commit/PR) |
|---|------|---------------|-------------|--------|------------|------------------|
| 1 | Serial pre: ports (`ArchiveStore`, `ImageBuilder`, `Orchestrator`, provider extensions), domain fields/transitions/sentinels/slug, migration `20260731120000` | agent-A | `internal/ports/`, `internal/domain/app/`, `db/migrations/20260731120000_*` | todo | — | — |
| 2 | S3 `ArchiveStore` adapter (presign put/get, head, delete) + tests | agent-B | `internal/adapters/storage/s3/` | todo | 1 | — |
| 3 | Buildah `ImageBuilder` adapter (size-capped fetch, subprocess run, log tail, env creds) + tests | agent-C | `internal/adapters/builder/buildah/` | todo | 1 | — |
| 4 | k3s provider: `WaitHealthy`, `EnsurePullSecret`, PORT env, firecracker class, `naming.go` DRY extraction | agent-C | `internal/adapters/provider/k3s/` | todo | 1 | — |
| 5 | go-workflows adapter: backend, `DeploymentWorkflow` + activities + compensation, `Orchestrator` impl, worker bootstrap; `deploy.Service` (CreateUpload/StartDeploy/Retry/Destroy), shared `extractTarball` move, `sanitizeUserError` | agent-D | `internal/adapters/workflow/`, `internal/application/deploy/`, `internal/application/app/` | todo | 1 | — |
| 6 | HTTP handlers: create/deploy/upload-url/status/retry/delete + DTOs + error mapping + Swagger godoc | agent-E | `internal/adapters/http/web/v1/app_handler.go`, `app_dto.go` | todo | 1 | — |
| 7 | Serial post: wire `cmd/server/main.go` (incl. embedded worker), `v1/routes.go`, config structs + yaml + defaults; `go generate ./...`, `crank swag`, `crank tidy` | agent-A | choke-point files (`cmd/server/`, `internal/adapters/http/web/v1/routes.go`, `internal/config/`, `configs/config.yaml`, `go.mod/go.sum`) | todo | 2–6 | — |
| 8 | Infra provisioning: zot (S3 driver) + buildah + subuid + TLS + firewall on infra host; `agni-registry` bucket + creds; k3s pull secret + runtime classes; e2e fixture script (Dockerfile app → URL 200; missing-Dockerfile → failed) | agent-C | `deploy/` | todo | 7 | — |
| 9 | views UI: two-step upload (metadata → presigned PUT with progress → deploy), status polling page, error display, retry/delete buttons | agent-E | `views/src/` | todo | 7 | — |
| 10 | Validation: `crank gofmt && crank vet && crank test`; run e2e fixture on dev k3s; stamp docs Done | agent-A | — | todo | 8, 9 | — |

## Per-Agent Sections

> Parallel safety: each agent edits ONLY its own section and only files inside
> its assigned write scope. Choke-point files (routes.go, main.go, config,
> migrations, go.mod) are touched ONLY by agent-A in serial phases.

### Agent: agent-A (serial pre + post)
- [ ] Task 1 — ports, domain changes, migration (pre-phase)
- [ ] Task 7 — wiring, config, regeneration (post-phase)
- [ ] Task 10 — full validation + doc stamping
- Notes / blockers: task 1 defines the contracts everyone else consumes — do
  not start 2–6 until it lands.

### Agent: agent-B (storage)
- [ ] Task 2 — S3 adapter
- Notes / blockers: presign PUT must use POST policy with
  `content-length-range` where supported (see 02b, P3).

### Agent: agent-C (build + k8s + infra)
- [ ] Task 3 — buildah adapter
- [ ] Task 4 — k3s provider extensions
- [ ] Task 8 — infra provisioning + e2e fixture
- Notes / blockers: registry creds via env, never argv (02b, P6); task 8
  needs the infra host reachable + S3 bucket created.

### Agent: agent-D (workflow + application)
- [ ] Task 5 — go-workflows adapter + deploy.Service + shared helpers
- Notes / blockers: workflow code must stay deterministic (no maps/time/IO);
  single-writer rule — status changes only via command handlers (02b, P1, P7).

### Agent: agent-E (http + views)
- [ ] Task 6 — HTTP handlers + DTOs
- [ ] Task 9 — views UI
- Notes / blockers: error mapping helper maps sentinels → status codes (02b
  §4); ownership check before any other logic.

## Newly Discovered Work

> Purely additive tasks land here without re-approval. Anything that changes
> Phase 1 goals or Phase 2 architecture goes back to that phase first.

- [ ] (none yet)

## Drift Check

- Last reconciled against version control: 2026-07-31

## Done Log

- (none yet)
