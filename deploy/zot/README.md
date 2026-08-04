# deploy/zot/README.md
# Zot OCI Registry Deployment

Zot is an OCI-compliant container registry with S3 storage backend.
It runs **on the dedicated infra host** (outside the k3s workload cluster),
behind an nginx TLS reverse proxy.

## Architecture

```
k3s node (workload)          infra host (builder + registry)
┌─────────────────┐           ┌──────────────────────────────┐
│  Pod             │           │                               │
│  imagePullSecret │──pull──▶ │  nginx (TLS) ──▶ zot (:5000)  │
│  = zot-pull      │           │   :443           │ S3 driver  │
└─────────────────┘           │                   ▼            │
                              │            agni-registry       │
                              │            (S3 bucket)         │
                              │                               │
                              │  buildah ◀── push images       │
                              │  (rootless, daemonless)        │
                              └──────────────────────────────┘
```

## Storage

Zot uses the **S3 storage driver** — all blobs and manifests are stored in
the `agni-registry` S3 bucket. This makes zot **stateless**: no persistent
volumes, no volume management, survives infra host rebuilds.

## Provisioning

The infra host setup script (`deploy/infra/host-setup.sh`) handles all
installation and configuration. See that file for details.

## Configuration Reference

```yaml
storage:
  rootDirectory: /var/lib/zot        # temp local cache (non-durable)
  dedupe: true
  gc: true
  gcDelay: 1h
  gcInterval: 24h
  storageDriver:
    name: s3
    region: us-east-1
    bucket: agni-registry
    secure: true

http:
  address: 0.0.0.0
  port: 5000

extensions:
  scrub:
    enable: true
    interval: 24h
```

## Auth

Zot supports htpasswd-based auth. Create credentials:

```bash
# Install htpasswd
apt-get install -y apache2-utils

# Create htpasswd file
htpasswd -Bc /etc/zot/htpasswd agni-builder    # write access (build+push)
htpasswd -B /etc/zot/htpasswd agni-puller      # read-only (k3s pulls)

# Then reference in zot config:
# http:
#   auth:
#     htpasswd:
#       path: /etc/zot/htpasswd
```

## S3 Credentials

The S3 access credentials are passed to zot via environment variables in
the systemd unit file — never in the config YAML.

Required S3 IAM permissions:
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`

## Health Check

```bash
# Catalog (requires auth if enabled)
curl -k https://zoteg.anurag.store/v2/_catalog

# Systemd
systemctl status zot
journalctl -u zot -f
```
