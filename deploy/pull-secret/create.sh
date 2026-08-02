#!/usr/bin/env bash
set -euo pipefail

# deploy/pull-secret/create.sh
# Creates the imagePullSecret in the agni namespace so k3s workload pods
# can pull images from the zot registry.
#
# Usage:
#   REGISTRY_URL=registry.agni.dev \
#   REGISTRY_USERNAME=agni-puller \
#   REGISTRY_PASSWORD= \
#   ./create.sh

REGISTRY_URL="${REGISTRY_URL}"
REGISTRY_USERNAME="${REGISTRY_USERNAME}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD}"

if [[ -z "${REGISTRY_URL}" ]]; then
  echo "error: REGISTRY_URL is required" >&2
  exit 1
fi
if [[ -z "${REGISTRY_USERNAME}" ]]; then
  echo "error: REGISTRY_USERNAME is required" >&2
  exit 1
fi
if [[ -z "${REGISTRY_PASSWORD}" ]]; then
  echo "error: REGISTRY_PASSWORD is required" >&2
  exit 1
fi

# Create namespace if needed
kubectl get namespace agni &>/dev/null || kubectl create namespace agni

# Delete existing secret if present
kubectl -n agni delete secret zot-pull --ignore-not-found

# Create docker-registry type secret
kubectl -n agni create secret docker-registry zot-pull \
  --docker-server="${REGISTRY_URL}" \
  --docker-username="${REGISTRY_USERNAME}" \
  --docker-password="${REGISTRY_PASSWORD}"

echo "Pull secret 'zot-pull' created in namespace 'agni'"
echo "Verify: kubectl -n agni get secret zot-pull -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d"
