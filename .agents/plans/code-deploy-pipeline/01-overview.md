# Overview Plan: Code Deploy Pipeline (Upload → Build → Run → URL)

- Status: Approved
- Slug: `code-deploy-pipeline`
- Form: Full
- Author (agent/model + date): kimi-k3 / 2026-07-31
- Date: 2026-07-31

## 1. Request & Problem

Users upload a zip/tar.gz of a codebase that **must contain a Dockerfile**.
The system builds a container image, runs it, and hands back a public URL.
Build/run failures must propagate to the user as clear errors (no log
streaming in v1). Orchestration runs on **Temporal workflows**; infrastructure
is the existing **k3s cluster** with **Kata Containers** and **Firecracker**
available for workload isolation. Orchestration uses embedded durable
workflows (**go-workflows**, Postgres backend) inside the server binary.

## 2. Goals & Non-Goals

- Goals:
  - Archive upload (zip / tar.gz) with Dockerfile validation and explicit
    rejection when missing.
  - Async image build on k3s with status tracking and user-facing error
    propagation (which step failed + human-readable reason).
  - Deploy the built image as an isolated workload (Kata / Firecracker
    RuntimeClass) with resource limits.
  - Provision a per-deployment URL (`<slug>.run.<domain>`) and report it once
    the workload passes a health check.
  - Temporal-style durable workflow per deployment (go-workflows) driving:
    validate → build → resolve port → deploy → route → health-check, with
    retries, timeouts, and cleanup on failure.
- Non-goals (explicitly out of scope):
  - Log streaming / log viewer (errors only, v1).
  - Multi-port apps, replicas/autoscaling, persistent volumes, custom domains.
  - Auto-detection without a Dockerfile (buildpacks/nixpacks fallback).
  - Env var/secret injection UI, deployment rollback, metrics/billing.

## 3. Product Features

- User stories:
  - As a user, I upload my code and get a URL, so I can demo/share a running
    app without managing infra.
  - As a user, when my build fails I see a plain-language error (e.g. "image
    build failed at step 4: npm install exited 1"), so I can fix and retry.
  - As a user, I can stop/retry/delete my deployment.
- Key features:
  - Upload form (archive + optional port override) in the `views` React SPA.
  - Deployment status page: `queued → building → deploying → starting →
    running | failed(step, reason)`; URL shown when `running`.
  - Retry button on `failed` (restarts the workflow from scratch).
- UX / behavior notes:
  - If the app never opens a web port, deployment ends in a specific
    `no-web-port` failed state rather than hanging.
  - Frontend polls a status endpoint (no SSE/websockets in v1).

## 4. Engineering Overview (surface level)

- Rough approach:
  - Echo API creates the app row + presigned S3 PUT URL; the browser uploads
    the archive directly to S3, then `POST /apps/:id/deploy` starts a durable
    workflow (go-workflows, instance ID = app ID).
  - Workflow activities call the k3s API / BuildKit:
    1. **Build**: daemonless, rootless **buildah** on a dedicated infra host
       (outside the workload cluster) builds from the presigned S3 context and
       pushes to zot on the same infra host (one ephemeral process per build —
       no daemon).
    2. **Port resolution**: `PORT` env contract (default 8080) → image
       `EXPOSE` config → user override; verified by health check.
    3. **Deploy**: Pod/Deployment with `runtimeClassName: kata` (or
       `firecracker`), CPU/mem/pids limits, `PORT` env.
    4. **Route**: Service + Traefik Ingress (`<slug>.run.<domain>`); wildcard
       DNS + cert-manager TLS.
    5. **Health**: poll readiness/HTTP; on success persist URL + `running`.
  - Failures at any activity set `status=failed` with step + sanitized
    message; saga-style compensation tears down partial k8s resources.
- Affected areas of the system (name the project's actual layers/dirs):
  - `internal/domain` — Deployment aggregate + status state machine.
  - `internal/application` — command/query handlers (StartDeployment,
    GetDeployment, StopDeployment, RetryDeployment).
  - `internal/ports` — interfaces: BuildRunner, RuntimeDeployer, Router,
    ArchiveStore, DeploymentRepository.
  - `internal/adapters` — HTTP handlers (Echo), GORM repo, Temporal workflow
    + activities, k3s client-go adapter, MinIO/S3 adapter.
  - `views/` — upload + status UI.
  - `.crank.yaml` — add `temporal` feature (`crank add temporal`).
- Major building blocks / new components:
  - go-workflows (embedded, Postgres backend) — no separate orchestration server.
  - Rootless buildah (daemonless) + zot registry (S3-backed storage, stateless)
    on a dedicated infra host (outside the k3s workload cluster); endpoints
    config-driven.
  - S3-compatible object storage for archives; cert-manager + wildcard DNS.
- Dependencies (internal + external):
  - External: go-workflows, k3s API (client-go), buildah, zot,
    Traefik/nginx ingress, cert-manager, S3 (MinIO or AWS), dedicated infra
    host (VM) for zot + builds.
  - Prebuilt building blocks evaluated: **buildah** (build — chosen: truly
    daemonless rootless builds as ephemeral processes; over host-side
    nerdctl/docker for isolation + scale; over BuildKit, whose persistent
    buildkitd daemon adds mTLS/firewall surface for little gain on a
    single-host builder), **kpack/Tekton** (heavier alternative — deferred),
    **Knative** (rejected: too much platform), **Coolify/Dokploy** (full
    prebuilt PaaS — rejected: we are building our own flow), **Temporal**
    (rejected for v1: ops weight vs go-workflows; swap path preserved via the
    `ports.Orchestrator` interface).

## 5. Risks & Unknowns

- Arbitrary code execution: build (Kaniko args) and run stages must be
  hardened; Kata/Firecracker isolation is the mitigation — Firecracker node
  setup (firecracker-containerd/flintlock) maturity unknown.
- Wildcard DNS + TLS (DNS-01) requires control of the chosen base domain.
- Docker Hub pull rate limits during builds → may need registry mirror/cache.
- Port guessing is unreliable for apps that ignore `PORT`/bind 127.0.0.1 —
  accepted v1 risk; surfaced as a targeted error.
- Cluster capacity: no admission control yet; unbounded concurrent builds
  could starve the cluster.

## 6. Open Questions for the User

- [ ] Temporal topology: self-host Temporal server on the k3s cluster, or use
  Temporal Cloud? (Also confirms running `crank add temporal`.)
- [ ] Which runtime is the **default** RuntimeClass: `kata` or `firecracker`?
  Is firecracker-containerd/flintlock already installed on the nodes?
- [ ] Base domain for URLs (needed for wildcard DNS + cert-manager DNS-01)?
- [ ] Archive storage: MinIO on k3s, or keep it simple with a PVC/local disk
  for v1?
- [ ] In-cluster registry: plain `registry:2` / zot on k3s — okay?
- [ ] v1 limits okay: 100 MB archive cap, 15 min build timeout, 30 min total
  workflow timeout, 1 running deployment per user?
- [ ] Deployments are scoped to the authenticated user (existing `auth`
  feature) — confirm.
- [ ] URL slug: user-chosen name (unique-checked) or generated
  `<name>-<shortid>`?

## 7. Review

- Reviewer comments: (2026-07-31) Answers to all open questions:
  1. Temporal: self-hosted on k3s. 2. Runtime: both kata and firecracker
  available (config-selectable, kata default). 3. URL config persisted in
  storage (Postgres). 4. Archive storage: S3-compatible. 5. Registry: zot,
  hosted separately, endpoint in config. 6. Limits live in `configs/config.yaml`.
  7. Auth always required. 8. URL slugs: generated `<name>-<shortid>`.
- Resolution / changes made: folded into `02-engineering-doc.md`.
  Rev 2 (2026-07-31): BuildKit rootless replaces Kaniko (host-side nerdctl
  rejected: arbitrary-RUN code execution on API server); go-workflows
  (Postgres backend, embedded worker) replaces Temporal; direct-to-S3
  presigned upload replaces server-proxied upload; zot hosted in-cluster
  (config-movable to external host).
  Rev 3 (2026-07-31): zot + rootless buildkitd moved to a dedicated infra
  host outside the k3s workload cluster (isolation of untrusted builds;
  registry survives cluster rebuilds). Correction recorded: buildkitd is a
  daemon (client/daemon architecture); Kaniko was the daemonless option.
  Rev 4 (2026-07-31): Buildah replaces BuildKit for true daemonless builds —
  one rootless subprocess per build on the infra host, no persistent daemon
  to secure; local layer cache (`--layers`) is sufficient on a single-host
  builder.
  Rev 5 (2026-07-31): zot uses its S3 storage driver (dedicated
  `agni-registry` bucket) — stateless registry, no volume management on the
  infra host.
- Approval: [x] Approved by user (2026-07-31)
