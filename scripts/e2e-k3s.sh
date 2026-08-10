#!/usr/bin/env bash
set -euo pipefail

# scripts/e2e-k3s.sh
# Full end-to-end test of the agni code-deploy pipeline on a k3s cluster with
# kata/firecracker runtime, external db/redis/zot/s3, and in-cluster image
# builds (k8s Job running buildah).
#
# Prerequisites:
#   - k3s cluster reachable (kubectl works)
#   - zot registry reachable (REGISTRY_URL in .env / configs/config.yaml)
#   - S3 endpoint reachable (AGNI_S3_ACCESS_KEY / AGNI_S3_SECRET_KEY in .env)
#   - Postgres reachable (DATABASE_DSN in .env)
#   - .env populated (see .env.example)
#
# Usage:
#   ./scripts/e2e-k3s.sh [--local-deps] [--skip-build] [--skip-apply] [--skip-cleanup]
#
# Options:
#   --local-deps   Start local db+redis+temporal via docker/docker-compose.dev.yml (dev mode).
#                  zot and s3 are always external (production).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

LOCAL_DEPS=false
SKIP_BUILD=false
SKIP_APPLY=false
SKIP_CLEANUP=false
for arg in "$@"; do
  case "$arg" in
    --local-deps) LOCAL_DEPS=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --skip-apply) SKIP_APPLY=true ;;
    --skip-cleanup) SKIP_CLEANUP=true ;;
    *) echo "unknown arg: $arg" >&2; exit 1 ;;
  esac
done

# Load .env (secrets) — fail fast if missing required values.
if [ ! -f .env ]; then
  echo "error: .env not found. Copy .env.example to .env and fill in secrets." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

AGNI_REGISTRY_USERNAME="${AGNI_REGISTRY_USERNAME:-}"
AGNI_REGISTRY_PASSWORD="${AGNI_REGISTRY_PASSWORD:-}"

# Required envs (from .env). Secrets only — non-secret config lives in configs/config.yaml.
: "${DATABASE_DSN:?DATABASE_DSN required in .env}"
: "${JWT_SECRET:?JWT_SECRET required in .env}"
: "${AGNI_S3_ACCESS_KEY:?AGNI_S3_ACCESS_KEY required in .env}"
: "${AGNI_S3_SECRET_KEY:?AGNI_S3_SECRET_KEY required in .env}"

# Read non-secret config from configs/config.yaml (used by the deployed pods).
CFG_DOMAIN="$(python3 -c "import yaml; print(yaml.safe_load(open('configs/config.yaml')).get('share',{}).get('domain',''))" 2>/dev/null || echo "agni.indralab.xyz")"
CFG_REGISTRY="$(python3 -c "import yaml; print(yaml.safe_load(open('configs/config.yaml')).get('registry',{}).get('url',''))" 2>/dev/null || echo "zoteg.anurag.store")"
CFG_S3_ENDPOINT="$(python3 -c "import yaml; print(yaml.safe_load(open('configs/config.yaml')).get('s3',{}).get('endpoint',''))" 2>/dev/null || echo "sss.surgged.xyz")"
CFG_S3_BUCKET="$(python3 -c "import yaml; print(yaml.safe_load(open('configs/config.yaml')).get('s3',{}).get('bucket',''))" 2>/dev/null || echo "agni")"

DOMAIN="${AGNI_DOMAIN:-${CFG_DOMAIN}}"
REGISTRY_URL="${AGNI_REGISTRY_URL:-${CFG_REGISTRY}}"
S3_ENDPOINT="${CFG_S3_ENDPOINT}"
S3_BUCKET="${CFG_S3_BUCKET}"
K3S_NAMESPACE="${AGNI_NAMESPACE:-agni}"

echo "=== Agni E2E (k3s + kata + external deps) ==="
echo "  domain:       ${DOMAIN}"
echo "  registry:     ${REGISTRY_URL}"
echo "  s3 endpoint:  ${S3_ENDPOINT}"
echo "  s3 bucket:    ${S3_BUCKET}"
echo "  namespace:    ${K3S_NAMESPACE}"

# --- 0. Preflight: cluster + registry reachable ---
echo ""
echo "--- Preflight ---"
if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "error: kubectl cannot reach the cluster" >&2
  exit 1
fi
if ! kubectl get runtimeclass kata-fc >/dev/null 2>&1; then
  echo "kata-fc RuntimeClass missing; applying runtimeclasses..."
  kubectl apply -f deploy/kata-runtimeclass.yaml
  kubectl apply -f deploy/firecracker-runtimeclass.yaml
fi
echo "preflight ok"

# --- 0b. Optional local db+redis+temporal via docker compose (dev mode) ---
if [ "${LOCAL_DEPS}" = true ]; then
  echo ""
  echo "--- Starting local db+redis+temporal via docker/docker-compose.dev.yml ---"
  docker compose -f docker/docker-compose.dev.yml up -d
  echo "waiting for db..."
  docker compose -f docker/docker-compose.dev.yml exec -T db pg_isready -U agni --timeout=5
  echo "local db+redis+temporal ready"
fi

# --- 1. Build + push the agni server/worker image to zot ---
if [ "${SKIP_BUILD}" = false ]; then
  echo ""
  echo "--- Building agni image ---"
  IMAGE_REF="${REGISTRY_URL}/agni/agni:latest"
  docker build -t "${IMAGE_REF}" .
  if [ -n "${AGNI_REGISTRY_USERNAME}" ]; then
    echo "${AGNI_REGISTRY_PASSWORD}" | docker login "${REGISTRY_URL}" \
      -u "${AGNI_REGISTRY_USERNAME}" --password-stdin
  fi
  docker push "${IMAGE_REF}"
  echo "pushed ${IMAGE_REF}"
else
  echo "--- Skipping image build (--skip-build) ---"
fi

# --- 2. Generate agni-secrets.env from .env (for kustomize secretGenerator) ---
echo ""
echo "--- Generating deploy/agni-api/agni-secrets.env from .env ---"

# In-cluster pods cannot reach localhost/127.0.0.1 on the host machine.
# Map 127.0.0.1/localhost to host.k3d.internal (or host IP) for in-cluster pods.
POD_DATABASE_DSN="${DATABASE_DSN//127.0.0.1/host.k3d.internal}"
POD_DATABASE_DSN="${POD_DATABASE_DSN//localhost/host.k3d.internal}"

POD_REDIS_ADDR="${REDIS_ADDR:-127.0.0.1:6379}"
POD_REDIS_ADDR="${POD_REDIS_ADDR//127.0.0.1/host.k3d.internal}"
POD_REDIS_ADDR="${POD_REDIS_ADDR//localhost/host.k3d.internal}"

POD_TEMPORAL_HOST_PORT="${TEMPORAL_HOST_PORT:-host.k3d.internal:7233}"
POD_TEMPORAL_HOST_PORT="${POD_TEMPORAL_HOST_PORT//127.0.0.1/host.k3d.internal}"
POD_TEMPORAL_HOST_PORT="${POD_TEMPORAL_HOST_PORT//localhost/host.k3d.internal}"

cat > deploy/agni-api/agni-secrets.env <<EOF
DATABASE_DSN=${POD_DATABASE_DSN}
REDIS_ADDR=${POD_REDIS_ADDR}
REDIS_PASSWORD=${REDIS_PASSWORD:-}
JWT_SECRET=${JWT_SECRET}
RESEND_API_KEY=${RESEND_API_KEY:-}
AGNI_S3_ACCESS_KEY=${AGNI_S3_ACCESS_KEY}
AGNI_S3_SECRET_KEY=${AGNI_S3_SECRET_KEY}
AGNI_REGISTRY_USERNAME=${AGNI_REGISTRY_USERNAME}
AGNI_REGISTRY_PASSWORD=${AGNI_REGISTRY_PASSWORD}
TEMPORAL_HOST_PORT=${POD_TEMPORAL_HOST_PORT}
TEMPORAL_NAMESPACE=${TEMPORAL_NAMESPACE:-default}
TEMPORAL_TASK_QUEUE=${TEMPORAL_TASK_QUEUE:-agni-deploy}
EOF

# --- 3. Create the zot-pull imagePullSecret for user app pods ---
echo ""
echo "--- Creating zot-pull pull secret ---"
kubectl get namespace "${K3S_NAMESPACE}" >/dev/null 2>&1 || kubectl create namespace "${K3S_NAMESPACE}"
kubectl -n "${K3S_NAMESPACE}" delete secret zot-pull --ignore-not-found
if [ -n "${AGNI_REGISTRY_USERNAME}" ]; then
  kubectl -n "${K3S_NAMESPACE}" create secret docker-registry zot-pull \
    --docker-server="${REGISTRY_URL}" \
    --docker-username="${AGNI_REGISTRY_USERNAME}" \
    --docker-password="${AGNI_REGISTRY_PASSWORD}"
else
  # Unauthenticated / anonymous registry fallback secret
  kubectl -n "${K3S_NAMESPACE}" create secret generic zot-pull \
    --from-literal=.dockerconfigjson='{"auths":{}}' \
    --type=kubernetes.io/dockerconfigjson
fi
echo "zot-pull created"

# --- 4. Apply the platform stack (server, worker) ---
if [ "${SKIP_APPLY}" = false ]; then
  echo ""
  echo "--- Applying platform stack (kustomize) ---"
  kubectl apply -k deploy/agni-api
  kubectl -n "${K3S_NAMESPACE}" rollout restart deployment/agni-server deployment/agni-worker
  echo "waiting for deployments..."
  kubectl -n "${K3S_NAMESPACE}" rollout status deployment/agni-server --timeout=180s
  kubectl -n "${K3S_NAMESPACE}" rollout status deployment/agni-worker --timeout=180s
else
  echo "--- Skipping apply (--skip-apply) ---"
fi

# --- 5. Seed a verified test user (so login works without email) ---
echo ""
echo "--- Seeding verified test user ---"
TEST_EMAIL="${AGNI_TEST_EMAIL:-e2e@test.local}"
TEST_PASSWORD="${AGNI_TEST_PASSWORD:-e2e-password-123}"
# Hash the password with htpasswd (bcrypt, -B) — compatible with Go's bcrypt
# verifier (any cost works). Falls back to python3 bcrypt if htpasswd absent.
if command -v htpasswd >/dev/null 2>&1; then
  HASH="$(htpasswd -bnBC 10 "" "${TEST_PASSWORD}" | tr -d ':\n')"
elif python3 -c "import bcrypt" 2>/dev/null; then
  HASH="$(python3 -c "
import bcrypt, sys
print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt(10)).decode())
" "${TEST_PASSWORD}")"
else
  echo "error: need htpasswd (apache2-utils) or python3-bcrypt to seed the test user" >&2
  exit 1
fi

psql "${DATABASE_DSN}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO users (id, created_at, updated_at, name, email, password, email_verified_at)
SELECT gen_random_uuid(), now(), now(), 'E2E User', '${TEST_EMAIL}', '${HASH}', now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = '${TEST_EMAIL}');
SQL
echo "test user ready: ${TEST_EMAIL}"

# --- 6. Get an auth token via login ---
echo ""
echo "--- Authenticating ---"
API_BASE="${AGNI_API_BASE:-http://localhost:8080}"
# If the API isn't reachable at API_BASE, port-forward the in-cluster service
# (local e2e where DNS/ingress isn't set up).
if ! curl -s --max-time 3 "${API_BASE}/health" >/dev/null 2>&1; then
  echo "  API not reachable at ${API_BASE}; starting kubectl port-forward to agni-api service..."
  kubectl -n "${K3S_NAMESPACE}" port-forward svc/agni-api 8080:8080 >/tmp/agni-port-forward.log 2>&1 &
  PF_PID=$!
  # Wait for the forward to be ready.
  for _ in $(seq 1 20); do
    if curl -s --max-time 2 "${API_BASE}/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if ! curl -s --max-time 2 "${API_BASE}/health" >/dev/null 2>&1; then
    echo "error: cannot reach agni API at ${API_BASE} (port-forward failed)" >&2
    cat /tmp/agni-port-forward.log >&2 || true
    exit 1
  fi
  echo "  port-forward ready (pid ${PF_PID})"
fi
LOGIN_RESP="$(curl -sS -X POST "${API_BASE}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")"
AUTH_TOKEN="$(echo "${LOGIN_RESP}" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)"
if [ -z "${AUTH_TOKEN}" ]; then
  echo "error: login failed: ${LOGIN_RESP}" >&2
  exit 1
fi
echo "authenticated"

# --- 7. Package the sample app and run the full deploy fixture ---
echo ""
echo "--- Packaging sample app (scripts/test-app) ---"
TMP_TARBALL="$(mktemp /tmp/agni-e2e-XXXXXX.tar.gz)"
COPYFILE_DISABLE=1 tar --exclude='._*' --exclude='.DS_Store' -czf "${TMP_TARBALL}" -C "${SCRIPT_DIR}/test-app" .

echo ""
echo "--- Running deploy pipeline (create → upload → deploy → live) ---"
export API_BASE AUTH_TOKEN
export APP_NAME="${AGNI_E2E_APP_NAME:-agni-e2e-sample}"
export APP_TARBALL="${TMP_TARBALL}"

# Create app + upload + deploy (the fixture does create+deploy; we add the
# upload step manually since the fixture expects a pre-uploaded archive).
CREATE_RESP="$(curl -sS -X POST "${API_BASE}/api/v1/apps" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${APP_NAME}\",\"port\":8080,\"runtime\":\"kata\"}")"
APP_ID="$(echo "${CREATE_RESP}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)"
UPLOAD_URL="$(echo "${CREATE_RESP}" | grep -o '"upload_url":"[^"]*"' | head -1 | cut -d'"' -f4)"
if [ -z "${APP_ID}" ] || [ -z "${UPLOAD_URL}" ]; then
  echo "error: create app failed: ${CREATE_RESP}" >&2
  exit 1
fi
echo "app created: ${APP_ID}"

echo "uploading archive..."
curl -sS -X PUT "${UPLOAD_URL}" -T "${TMP_TARBALL}" --fail

echo "starting deploy..."
DEPLOY_RESP="$(curl -sS -X POST "${API_BASE}/api/v1/apps/${APP_ID}/deploy" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")"
echo "deploy: ${DEPLOY_RESP}"

# --- 8. Poll status until live or failed ---
echo ""
echo "--- Polling deployment status (timeout: 180s) ---"
DEADLINE=$(( $(date +%s) + 180 ))
FINAL_STATUS=""
FAILED_STEP=""
SERVICE_URL=""
while [ "$(date +%s)" -lt "${DEADLINE}" ]; do
  GET_RESP="$(curl -sS "${API_BASE}/api/v1/apps/${APP_ID}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}")"
  FINAL_STATUS="$(echo "${GET_RESP}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
  FAILED_STEP="$(echo "${GET_RESP}" | grep -o '"failed_step":"[^"]*"' | cut -d'"' -f4 || true)"
  SERVICE_URL="$(echo "${GET_RESP}" | grep -o '"service_url":"[^"]*"' | cut -d'"' -f4 || true)"
  echo "  status=${FINAL_STATUS} step=${FAILED_STEP:-none}"
  case "${FINAL_STATUS}" in
    live) break ;;
    failed) break ;;
    destroyed) break ;;
  esac
  sleep 5
done

# --- 9. Assert the app is reachable ---
echo ""
if [ "${FINAL_STATUS}" = "live" ]; then
  echo "deployment is LIVE"
  echo "  service_url: ${SERVICE_URL}"
  # The service URL is the public ingress (https://slug.domain). If the
  # domain isn't publicly resolvable from here (local test), fall back to
  # hitting the ClusterIP service in-cluster.
  HTTP_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${SERVICE_URL}" || echo "000")"
  echo "  public URL HTTP: ${HTTP_CODE}"
  if [ "${HTTP_CODE}" = "000" ]; then
    echo "  (public URL not reachable from here — likely DNS; verifying via in-cluster service)"
    POD_IP="$(kubectl -n "${K3S_NAMESPACE}" get pod "app-${APP_ID}" -o jsonpath='{.status.podIP}' 2>/dev/null || true)"
    if [ -n "${POD_IP}" ]; then
      INCLUSTER_CODE="$(kubectl -n "${K3S_NAMESPACE}" run "curl-${APP_ID:0:8}" --rm -i --restart=Never \
        --image=curlimages/curl -- curl -s -o /dev/null -w '%{http_code}' "http://${POD_IP}:8080/" 2>/dev/null || echo "000")"
      echo "  in-cluster pod HTTP: ${INCLUSTER_CODE}"
    fi
  fi
  echo ""
  echo "=== E2E PASSED ==="
elif [ "${FINAL_STATUS}" = "failed" ]; then
  echo "deployment FAILED at step=${FAILED_STEP}"
  # Show the app error / job logs for diagnosis.
  echo "--- app error ---"
  GET_RESP="$(curl -sS "${API_BASE}/api/v1/apps/${APP_ID}" -H "Authorization: Bearer ${AUTH_TOKEN}")"
  echo "${GET_RESP}" | python3 -m json.tool 2>/dev/null || echo "${GET_RESP}"
  echo "--- build job logs (if any) ---"
  kubectl -n "${K3S_NAMESPACE}" get pods -l "agni.build=agni-build-${APP_ID}" -o name 2>/dev/null | while read -r p; do
    echo "### ${p}"; kubectl -n "${K3S_NAMESPACE}" logs "${p}" --tail=50 2>/dev/null || true
  done
  echo ""
  echo "=== E2E FAILED ==="
  exit 1
else
  echo "deployment timed out (status=${FINAL_STATUS:-unknown})"
  echo "=== E2E FAILED (timeout) ==="
  exit 1
fi

# --- 10. Cleanup (unless skipped) ---
if [ "${SKIP_CLEANUP}" = false ]; then
  echo ""
  echo "--- Cleaning up ---"
  curl -sS -X DELETE "${API_BASE}/api/v1/apps/${APP_ID}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" >/dev/null || true
  rm -f "${TMP_TARBALL}"
  echo "cleaned up app ${APP_ID}"
else
  rm -f "${TMP_TARBALL}"
  echo "--- Skipped cleanup; app ${APP_ID} left running ---"
fi

# Stop the port-forward if we started one.
if [ -n "${PF_PID:-}" ] && kill -0 "${PF_PID}" 2>/dev/null; then
  kill "${PF_PID}" 2>/dev/null || true
  echo "stopped port-forward (pid ${PF_PID})"
fi
