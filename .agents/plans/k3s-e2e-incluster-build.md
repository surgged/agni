# Plan: Full E2E with in-cluster image build (kata/firecracker)

## Goal
- server, worker, UI, temporal, temporal-ui, and firecracker run **on k3s (kata)**
- db, redis, zot, s3 run **external** (local: docker for db/redis; prod zot/s3)
- image build happens **in the k3s cluster** (k8s Job running buildah)
- same setup as production; local uses docker for db/redis + prod zot/s3
- one script boots everything and runs a full end-to-end test

## Findings (current state)
1. `deploy/agni-api/` was removed (previous cleanup). Need to restore + extend for full stack.
2. The **workflow build path does NOT push** — `buildah.Build()` only runs `bud`; `BuildSpec.RegistryAuth` exists but is unused. The old `pipeline.go` (unused by API) had a `push`, but the Temporal workflow path doesn't. **This must be added** for in-cluster build → zot.
3. `buildah` needs to run **inside k3s** (as a k8s Job) to satisfy "build in the cluster", since the worker host doesn't have buildah. Add a k8s-Job-based ImageBuilder.
4. `DeployRuntime` hardcodes `ImagePullSecret: "zot-pull"` and `runtimeClass: kata-fc`. Good — keep, but the pull secret must point at the external zot (`zoteg.anurag.store`) so kata pods can pull.
5. Ingress `auth-url` points at `agni-api.agni.svc:8080` — works **only if agni-api runs in the cluster** (which is now the plan). Keep as-is, but make it config-driven.
6. `deploy/kata-runtimeclass.yaml` + `firecracker-runtimeclass.yaml` are NOT applied by host-setup. Need to add.
7. `configs/config.yaml` has localhost defaults for db/redis/temporal; `registry.url: zoteg.anurag.store` (good), `k3s.registry_addr` unused/dead.
8. `cmd/worker` and `cmd/server` both build `buildah.NewBuilder("buildah", "", "")` — will swap to a Job-based builder when in-cluster.

## Design
- **In-cluster build**: Replace (or add an option to) `ImageBuilder` with a `k8sJobBuilder` that:
  - takes the `ContextURL` (S3 presigned GET) + `ImageRef` + `RegistryAuth`
  - creates a k8s Job in ns `agni` with an image that contains buildah (e.g. `quay.io/buildah/stable`), a `buildah bud` + `buildah push` script
  - waits for Job completion, tails logs, returns error on failure
- **Worker** stays a deployment; it talks to k3s API (in-cluster) to launch the build Job.
- **Local build shortcut**: keep `docker/nerdctl` fallback for when no cluster is present (dev mode).
- **Deploy stack**: one kustomization in `deploy/agni-api/` (or new `deploy/stack/`) containing server, worker, UI (views), temporal, temporal-ui, plus secrets/configmaps referencing external db/redis/zot/s3.
- **External services**: db/redis via docker-compose (local) — but for the k3s test, db/redis are reachable via host networking or NodePort. Actually simpler: run db/redis/zot/s3 on the host or docker; k3s pods reach them via `host.docker.internal` or node IP.
- **E2E script**: `scripts/e2e-k3s.sh` that:
  1. builds + pushes agni server/worker/UI images to zot
  2. `kubectl apply -k deploy/stack`
  3. waits for pods ready
  4. runs the fixture against the ingress URL

## Open questions / decisions to confirm
- Where does buildah's Job image come from? Needs to be in the zot registry or public quay. Use `quay.io/buildah/stable` (public) to avoid registry-bootstrap problem.
- How do k3s pods reach local docker db/redis/zot? k3s node IP (or host.docker.internal if k3s on same host).
- The pull secret `zot-pull` must be created for the `agni` namespace with the external zot creds.

## Steps
1. Add push to buildah builder (or Job builder does bud+push).
2. Add `k8sJobBuilder` implementing `ports.ImageBuilder` (Job-based, waits, tails logs).
3. Add registry credentials → Job env/secret; ensure `zot-pull` secret exists.
4. Restore/extend deploy manifests: server, worker, UI, temporal, temporal-ui, configmaps, secrets.
5. Add runtimeclasses to kustomization.
6. Make `auth-url` config-driven (or document keep).
7. Write `scripts/e2e-k3s.sh` full script.
8. Test end-to-end.
