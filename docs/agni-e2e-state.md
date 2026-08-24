# Agni Deployment State & E2E Setup — Working Notes

> Date: 2026-08-06
> Context: Rearchitecting so that **server, worker, UI, temporal, temporal-ui, and firecracker run on k3s (kata)**; **db, redis, zot, s3 stay external**; **image builds happen inside the k3s cluster**. Local dev uses docker for db/redis, production zot/s3.
> This file captures the complete state of changes made in this session.

---

## 1. Target Architecture (production parity)

```
                    ┌────────────────────────── k3s cluster (agni ns) ──────────────────────────┐
   users ──https──► │  Ingress (nginx) ──► agni-server (UI+API, embedded SPA)                  │
                    │  agni-worker ── creates k8s Job ──► buildah (bud + push)                │
                    │  temporal + temporal-ui (workflow orchestration)                        │
                    │  user app pods: runtimeClassName kata-fc / firecracker                  │
                    │     └─ Pod (app-<id>) + Service + Ingress (auth via agni-api svc)       │
                    └───────────────┬─────────────────────────────────────────────────────────┘
                                    │
              external (NOT in k3s) │
   ┌────────────────────────────────┼──────────────────────────────────┐
   │  PostgreSQL ── db              │                                  │
   │  Redis                         │  image pulls/pushes              │
   │  zot registry (zoteg.anurag.store) ◄──────────────►              │
   │  S3 (sss.surgged.xyz)          │  archives (source zips)          │
   └────────────────────────────────┴──────────────────────────────────┘
```

- **In cluster:** agni-server, agni-worker, temporal, temporal-ui, user app pods (kata/firecracker), build Jobs.
- **External:** PostgreSQL, Redis, zot (OCI registry), S3 (object storage).
- **Build:** worker launches a k8s Job (`agni-build-<appID>`) running `quay.io/buildah/stable`; the Job downloads the source archive from S3 (presigned URL), runs `buildah bud`, then `buildah push` to zot. The Job is privileged, uses vfs storage driver, and is deleted after completion (with its credential Secret).

---

## 2. Key Findings That Drove the Changes

1. **The workflow build path never pushed images.** `buildah.Builder.Build()` only ran `bud`; `BuildSpec.RegistryAuth` existed but was unused. The old `deploy/pipeline.go` (not wired to the API) had a `push`, but the Temporal workflow path didn't. **Fixed** — push added to the builder.
2. **`k3s.registry_addr` was dead config.** The provider stored it but never used it in manifests; the real image ref comes from `registry.url` (`BuildImageRef`). Now the deploy kustomization uses `registry.url` consistently.
3. **Ingress `auth-url` was hardcoded** to `http://agni-api.<ns>.svc:8080/auth/session?app=<id>`. Now it's config-driven (`Provider.authURL`, defaulting to the in-cluster service) so it works whether agni-api is in-cluster or external.
4. **kata/firecracker RuntimeClasses existed but weren't applied** by the host setup. Now included in the root kustomization.
5. **Buildah must run in-cluster.** The worker is a pod; host buildah isn't available inside it. Added `JobBuilder` (k8s Job) as the primary `ports.ImageBuilder`, with the host buildah builder as fallback when no cluster is reachable (dev mode).

---

## 3. Changes Made (Files)

### Code (Go)

| File | Change |
|---|---|
| `internal/adapters/builder/buildah/builder.go` | Added `push` step after `bud`; uses `RegistryAuth` via a temp authfile (never on CLI); added `registryServer()` helper. |
| `internal/adapters/builder/buildah/job_builder.go` | **New.** `JobBuilder` — k8s Job-based `ports.ImageBuilder`. Creates namespace, credential Secret, Job running buildah (download → bud → push with vfs), waits for completion, tails logs on failure, cleans up Job+Secret. Falls back to nil (→ host builder) when no cluster. |
| `internal/composition/composition.go` | `Infra.ImageBuilder` is now `ports.ImageBuilder`; picks `JobBuilder` when a cluster is reachable, else host buildah. |
| `internal/adapters/workflow/activities_build.go` | Passes `RegistryAuth` from `Deps` into `BuildSpec`. |
| `internal/adapters/workflow/deps.go` | Added `RegistryAuth ports.RegistryAuth` to `ActivityDeps`. |
| `cmd/worker/main.go` | Wires `RegistryAuth` from `cfg.Registry` into `ActivityDeps`. |
| `internal/adapters/provider/k3s/provider.go` | Added `authURL` field (default `http://agni-api.<ns>.svc:8080/auth/session?app=`); passes `AuthURL` into template params. |
| `internal/adapters/provider/k3s/templates.go` | Ingress `auth-url` annotation uses `{{.AuthURL}}` instead of hardcoded svc URL. |

### Deploy (k8s manifests)

| File | Change |
|---|---|
| `deploy/agni-api/kustomization.yaml` | Restructured: resources = namespace, server-deployment, worker-deployment, temporal-deployment, temporal-ui-deployment, service, ingress. Adds `secretGenerator` (agni-secrets from `agni-secrets.env`) + `configMapGenerator` (config from `config.yaml`). |
| `deploy/agni-api/namespace.yaml` | **New.** `agni` namespace. |
| `deploy/agni-api/server-deployment.yaml` | **New.** `agni-server` Deployment (image `zoteg.anurag.store/agni/agni:latest`, command `/app/server`), mounts configMap at `/app/configs`, envFrom agni-secrets, health probes. |
| `deploy/agni-api/worker-deployment.yaml` | **New.** `agni-worker` Deployment (same image, command `/app/worker`) + ServiceAccount `agni-worker` + Role/RoleBinding (pods, services, secrets, configmaps, namespaces, jobs, ingresses, pods/log). |
| `deploy/agni-api/temporal-deployment.yaml` | **New.** `temporal` Deployment (`temporalio/auto-setup:latest`) using external Postgres (env from agni-secrets: temporal-postgres-host/user/password), DBs `temporal` + `temporal_visibility`, Service on 7233. |
| `deploy/agni-api/temporal-ui-deployment.yaml` | **New.** `temporal-ui` Deployment (`temporalio/ui:latest`) + Service on 8080. |
| `deploy/agni-api/service.yaml` | `agni-api` Service → selector `app: agni-server` port 8080. |
| `deploy/agni-api/ingress.yaml` | `agni-api` Ingress (host `agni.indralab.xyz`, TLS via letsencrypt-prod) + `temporal-ui` Ingress (host `temporal.agni.indralab.xyz`). |
| `deploy/agni-api/config.yaml` | **New.** Production-ish config: `share.domain`, `k3s.*`, `s3.*`, `registry.url`, `workflows.host_port: temporal.agni.svc:7233`. Secrets left empty (env-provided). |
| `deploy/agni-api/agni-secrets.env` | **New (placeholder).** Overwritten by `scripts/e2e-k3s.sh` from `.env`. Values are `REPLACE_ME` so a bare apply fails fast. |
| `deploy/kustomization.yaml` | Now includes `cert-manager/cluster-issuer.yaml` + `kata-runtimeclass.yaml` + `firecracker-runtimeclass.yaml` + `agni-api`. |
| `deploy/agni-api/{configmap.yaml,deployment.yaml}` | Deleted (replaced by the new structure). |

### Scripts & config

| File | Change |
|---|---|
| `scripts/e2e-k3s.sh` | **New.** Full end-to-end test: builds+pushes agni image to zot, generates agni-secrets.env from `.env`, creates `zot-pull` secret, `kubectl apply -k deploy/agni-api`, seeds a verified test user (htpasswd/python3 bcrypt), logs in, creates app → uploads archive → deploys → polls → asserts live URL. Supports `--local-deps`, `--skip-build`, `--skip-apply`, `--skip-cleanup`, and auto port-forward. |
| `scripts/agni-host-setup.sh` | Updated: no longer deploys agni-api; states cluster is kata/firecracker workloads only; next steps point to `deploy/pull-secret/create.sh`. |
| `dev/docker-compose.yml` | Added `minio` (S3 substitute) + `registry` (OCI substitute) services for local e2e. |
| `.env.example` | Added optional e2e overrides (AGNI_* vars). |
| `.gitignore` | (Unchanged after reconsideration — the placeholder `agni-secrets.env` stays committed so kustomize always renders.) |

### Docs / plans

| File | Change |
|---|---|
| `.agents/plans/k3s-e2e-incluster-build.md` | **New.** The design plan for this rearchitecture. |
| `docs/agni-e2e-state.md` | **This file.** |

> Note: `.agents/CODE_REVIEW.md` was already modified before this session (pre-existing change, not part of this work).

---

## 4. How to Run the E2E

### Prerequisites
- k3s/k3d cluster reachable via `kubectl` (with `kata-fc` RuntimeClass applied).
- `.env` populated (see `.env.example`).
- zot registry + S3 reachable (production), **or** local substitutes (see below).
- `htpasswd` (apache2-utils) or `python3 -c "import bcrypt"` for the seed step.

### Full production-like run
```bash
./scripts/e2e-k3s.sh
```

### Local run (docker db/redis/temporal/minio/registry + k3d cluster)
```bash
docker compose -f dev/docker-compose.yml up -d db redis temporal-dev minio registry
# point .env at local substitutes:
#   DATABASE_DSN=postgres://agni:agni@127.0.0.1:5432/agni?sslmode=disable
#   AGNI_S3_ACCESS_KEY=minioadmin  AGNI_S3_SECRET_KEY=minioadmin
#   AGNI_REGISTRY_USERNAME= (empty)  AGNI_REGISTRY_PASSWORD= (empty)
#   (override registry url + s3 endpoint via AGNI_REGISTRY_URL=http://localhost:5000 and config)
./scripts/e2e-k3s.sh --local-deps
```

### What the script does (step by step)
1. Preflight: kubectl cluster-info + `kata-fc` RuntimeClass present.
2. (Optional `--local-deps`) docker compose up db+redis.
3. Build + push `agni` image to zot (`docker build` + `docker push`).
4. Generate `deploy/agni-api/agni-secrets.env` from `.env` (real secrets; gitignored via placeholder).
5. Create `zot-pull` docker-registry secret in `agni` ns.
6. `kubectl apply -k deploy/agni-api`; rollout-status all 4 deployments.
7. Seed verified test user in Postgres (bcrypt via htpasswd/python3).
8. Auto port-forward `svc/agni-api` if API not reachable at `AGNI_API_BASE`.
9. Login → get Bearer token.
10. Package `scripts/test-app` → POST `/api/v1/apps` → PUT archive to S3 presigned URL → POST deploy.
11. Poll status until `live`/`failed`/timeout (180s).
12. Assert `service_url` returns HTTP <500 (public or in-cluster fallback).
13. Cleanup app + port-forward (unless `--skip-cleanup`).

---

## 5. Current Gaps / Known Limitations

1. **kata shim not installed in the k3d node** — the `kata-fc` RuntimeClass exists but the node's containerd has no `kata-fc` handler, so app pods fail to schedule on this local k3d. The full pipeline (build Job → push → deploy → health) is exercised, but the final pod runtime requires a real kata-enabled node (e.g. the production k3s host via `scripts/agni-host-setup.sh` + kata install).
2. **Production zot/S3 not reachable from this dev machine** — connectivity to `zoteg.anurag.store` and `sss.surgged.xyz` failed here; use local substitutes for dev e2e, or run the script from a machine with access.
3. **`firecracker` RuntimeClass requires node label `runtime: firecracker`** — not labeled on the k3d node; selectable via `"runtime":"firecracker"` in the create request.
4. **Temporal `auto-setup` image** requires the external Postgres to have `temporal` + `temporal_visibility` DBs (the auto-setup creates them if the user has rights). The e2e script does not create them — if temporal fails to start, create them manually:
   ```sql
   CREATE DATABASE temporal; CREATE DATABASE temporal_visibility;
   ```
5. **Worker RBAC is namespace-scoped (Role)** — the worker creates Jobs/pods/services/ingresses only in `agni`. If you deploy user apps to other namespaces, widen the Role (or use a ClusterRole).
6. **JobBuilder uses `quay.io/buildah/stable`** (public). If the cluster can't reach quay (air-gapped), mirror it into zot and set the image accordingly.
7. **Privileged build Job** — buildah needs privileges; k3s allows privileged by default. On hardened clusters, add the appropriate PodSecurity admission exception or a dedicated privileged policy for the `agni` namespace.
8. **The old `deploy/pipeline.go` direct-deploy path is still in the tree but unused by the API** — it has its own local build (docker/nerdctl) logic. Not removed; flagged for future cleanup.
9. **`auth-url` is now config-driven but hardcoded to the in-cluster service name** in `NewProvider`/`NewProviderWithClientset`. If agni-api moves external, set `Provider.authURL` to the public URL instead.

---

## 6. Config Reference (what reads what)

| Setting | File | Used by |
|---|---|---|
| `share.domain` | `configs/config.yaml` (+ `deploy/agni-api/config.yaml`) | Ingress hosts, `BuildServiceURL`, login redirect |
| `k3s.namespace` | config | Provider + JobBuilder |
| `k3s.registry_addr` | config | **Deprecated/unused in manifests** (kept for compat) |
| `k3s.kata_runtime_class` / `k3s.cert_issuer` / `k3s.ingress_class` | config | Provider defaults |
| `registry.url` | config | `BuildImageRef` (image refs) + e2e push target |
| `registry.username` / `registry.password` | `.env` (`AGNI_REGISTRY_USERNAME/PASSWORD`) | Worker → build Job push creds + `zot-pull` secret |
| `s3.*` | config + `.env` (`AGNI_S3_*`) | Archive store (upload/presign) |
| `database.dsn` | `.env` (`DATABASE_DSN`) | Server + worker GORM |
| `redis.addr` / `redis.password` | config + `.env` | Sessions |
| `workflows.host_port` | config + `.env` (`TEMPORAL_HOST_PORT`) | Temporal client/worker → `temporal.agni.svc:7233` in-cluster |
| `mcp.agent_signing_secret` | `.env` (`JWT_SECRET`-adjacent) | Agent token signing |

**Secret flow:** `.env` → `scripts/e2e-k3s.sh` → `deploy/agni-api/agni-secrets.env` → kustomize `secretGenerator` → `agni-secrets` Secret → `envFrom` on server/worker + `secretKeyRef` on temporal.

---

## 7. Rollback Notes

- To revert to "platform deployed elsewhere" mode: delete `deploy/agni-api/` again, remove `agni-api` from `deploy/kustomization.yaml`, and set `Provider.authURL` to the external API URL (or the old hardcoded svc URL).
- The Go changes are additive (new `JobBuilder`, `push` step, `AuthURL` param); the only behavioral change is that builds now push and use a Job when a cluster is reachable. Host-mode buildah is preserved when no cluster is present.

---

## 8. Latest Architecture & App Preview Observations

- **External Temporal Orchestration**:
  Temporal runs as an external service (Docker Compose `temporal-dev` locally on `:7233` / `:8233`, external server in production) rather than inside the k3s cluster. `deploy/agni-api/kustomization.yaml` deploys `server` and `worker` platform pods. `TEMPORAL_HOST_PORT` maps in-cluster pods to `host.k3d.internal:7233`.
- **App Access & `/preview/:id` Route Behavior**:
  The `/preview/:id` endpoint was designed for static disk asset serving (`./data/apps/:id`). Because applications in Agni are compiled into OCI container images by `buildah` and run as live Kubernetes Pods (`app-<id>`), live workload access is performed via:
  1. **Direct Kubernetes Port-Forward**: `kubectl -n agni port-forward service/app-<id> 8081:8080` (open `http://localhost:8081`).
  2. **Public Ingress Route**: `https://<slug>.<domain>` (e.g. `https://agni-e2e-sample-fa17c0cb.agni.indralab.xyz`).
- **In-Cluster Host Network Mapping**:
  `scripts/e2e-k3s.sh` automatically maps `127.0.0.1` / `localhost` in DSNs to `host.k3d.internal` when populating `agni-secrets.env`, enabling pods in k3s to reach host-bound services (Postgres, Redis, Temporal).
- **Optional Registry Auth**:
  `AGNI_REGISTRY_USERNAME` and `AGNI_REGISTRY_PASSWORD` are optional. When omitted, `scripts/e2e-k3s.sh` generates an unauthenticated fallback `.dockerconfigjson` secret for `zot-pull`.
- **Cleaned Deploy Directory**:
  Obsolete host/standalone directories `deploy/zot/`, `deploy/pull-secret/`, and `deploy/infra/` were removed. `deploy/agni-api/` remains as the canonical Kubernetes platform manifest directory.
