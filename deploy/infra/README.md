# deploy/infra/README.md
# Infra Host Provisioning

The dedicated infra host runs **outside** the k3s workload cluster. It hosts:

- **Rootless buildah** — one ephemeral subprocess per build. No daemon.

Zot registry runs on a separate host (`zoteg.anurag.store`), deployed independently.

## Prerequisites

- Ubuntu 22.04+ (or any systemd-based distro with apt)

## Provisioning

```bash
sudo ./host-setup.sh
```

## Post-provision checks

```bash
sudo -u agni-builder buildah version

# Test build + push to zot
sudo -u agni-builder bash -c '
  mkdir -p /tmp/test-build && cd /tmp/test-build
  cat > Dockerfile <<EOF
FROM alpine:latest
CMD ["echo", "hello from agni"]
EOF
  buildah bud --layers -t zoteg.anurag.store/test:latest .
  buildah push zoteg.anurag.store/test:latest
'
```
