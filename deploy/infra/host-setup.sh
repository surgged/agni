#!/usr/bin/env bash
set -euo pipefail

# deploy/infra/host-setup.sh
# Provisions the dedicated infra host with buildah, user namespaces, and firewall rules.
#
# This host runs OUTSIDE the k3s workload cluster.
# It hosts: rootless buildah (daemonless builds). Zot registry runs on a separate host.
#
# Usage:
#   sudo ./host-setup.sh

echo "=== Provisioning agni infra host ==="

# ---- OS packages ----
echo "--- Installing packages ---"
apt-get update -qq
apt-get install -y --no-install-recommends \
  buildah \
  uidmap

# ---- Buildah user with subordinate UID/GID ranges ----
echo "--- Setting up agni-builder user ---"
if ! id agni-builder &>/dev/null; then
  useradd -m -s /bin/bash agni-builder
fi

grep -q '^agni-builder:' /etc/subuid || echo "agni-builder:100000:65536" >> /etc/subuid
grep -q '^agni-builder:' /etc/subgid || echo "agni-builder:100000:65536" >> /etc/subgid

# ---- Buildah storage ----
echo "--- Setting up buildah storage ---"
mkdir -p /var/lib/agni-builds
chown agni-builder:agni-builder /var/lib/agni-builds
chmod 750 /var/lib/agni-builds

echo ""
echo "=== Infra host provisioning complete ==="
echo "Buildah:     sudo -u agni-builder buildah version"
