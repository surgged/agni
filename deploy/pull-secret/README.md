# deploy/pull-secret/README.md
# Image Pull Secret

k3s workload pods need an `imagePullSecret` to authenticate with the zot
registry. This secret is created once per namespace and referenced in the
Pod spec via `spec.imagePullSecrets`.

The secret name `zot-pull` is hardcoded in the k3s provider adapter and
the workflow activities — it must match across all layers.

## Create

```bash
REGISTRY_URL=zoteg.anurag.store \
REGISTRY_USERNAME=agni-puller \
REGISTRY_PASSWORD= \
./create.sh
```

## Verify

```bash
kubectl -n agni get secret zot-pull
```

## Zot-side credentials

Create a dedicated read-only user in zot:

```json
// zot htpasswd entry (bcrypt)
agni-puller:$2a$10$...
```

The puller user only needs `pull` scope — it never pushes images.
The builder host uses separate write credentials (configured via
buildah env vars, never exposed to k3s).
