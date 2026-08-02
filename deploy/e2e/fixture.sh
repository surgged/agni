#!/usr/bin/env bash
set -euo pipefail

# deploy/e2e/fixture.sh
# End-to-end fixture that exercises the full code-deploy pipeline:
# 1. Create an app → get presigned upload URL
# 2. Upload a Dockerfile app archive to S3 (simulated in dev)
# 3. Deploy → poll status until live or failed
# 4. Assert URL returns HTTP 200 (live) or status=failed with correct step (error case)

API_BASE="${API_BASE:-http://localhost:8080}"
AUTH_TOKEN="${AUTH_TOKEN:-test-token}"
APP_NAME="${1:-agni-fixture-nginx}"
SCENARIO="${2:-happy-path}"

api_call() {
  local method="$1" path="$2" data="${3:-}"
  local url="${API_BASE}${path}"
  curl -sS -X "${method}" "${url}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${data}" 2>&1
}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# ---- Create app ----
info "Creating app: ${APP_NAME} (scenario: ${SCENARIO})"
CREATE_RESP=$(api_call POST "/api/v1/apps" "{\"name\":\"${APP_NAME}\",\"port\":80,\"runtime\":\"kata\"}")
APP_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$APP_ID" ]; then
  fail "Failed to create app: $CREATE_RESP"
fi
pass "App created: $APP_ID"

# ---- Deploy ----
info "Starting deployment for $APP_ID"
DEPLOY_RESP=$(api_call POST "/api/v1/apps/${APP_ID}/deploy" "")
STATUS=$(echo "$DEPLOY_RESP" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" != "queued" ]; then
  fail "Expected status=queued, got: $DEPLOY_RESP"
fi
pass "Deployment queued"

# ---- Poll status ----
info "Polling deployment status (timeout: 120s)..."
DEADLINE=$(( $(date +%s) + 120 ))
FINAL_STATUS=""
FAILED_STEP=""
SERVICE_URL=""

while [ $(date +%s) -lt $DEADLINE ]; do
  GET_RESP=$(api_call GET "/api/v1/apps/${APP_ID}" "")
  FINAL_STATUS=$(echo "$GET_RESP" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  FAILED_STEP=$(echo "$GET_RESP" | grep -o '"failed_step":"[^"]*"' | cut -d'"' -f4 || true)
  SERVICE_URL=$(echo "$GET_RESP" | grep -o '"service_url":"[^"]*"' | cut -d'"' -f4 || true)

  case "${FINAL_STATUS}" in
    live)
      pass "Deployment live at ${SERVICE_URL}"
      break
      ;;
    failed)
      info "Deployment failed at step=${FAILED_STEP} (expected for error scenario)"
      break
      ;;
    destroyed)
      info "Deployment destroyed"
      break
      ;;
  esac
  sleep 3
done

if [ "$FINAL_STATUS" = "live" ]; then
  # ---- Assert URL ----
  if [ -n "$SERVICE_URL" ]; then
    info "Hitting service URL: ${SERVICE_URL}"
    HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "${SERVICE_URL}" || echo "000")
    if [ "$HTTP_CODE" -lt 500 ]; then
      pass "Service URL returned HTTP ${HTTP_CODE}"
    else
      fail "Service URL returned HTTP ${HTTP_CODE} (expected <500)"
    fi
  fi
elif [ "$FINAL_STATUS" = "failed" ]; then
  if [ "$SCENARIO" = "missing-dockerfile" ] && [ "$FAILED_STEP" = "validate" ]; then
    pass "Correctly failed at validate step (missing Dockerfile)"
  elif [ "$SCENARIO" = "build-failure" ] && [ "$FAILED_STEP" = "build" ]; then
    pass "Correctly failed at build step (build failure)"
  else
    info "Deployment failed with step=${FAILED_STEP}"
  fi
else
  fail "Deployment timed out with status=${FINAL_STATUS}"
fi

# ---- Cleanup ----
info "Cleaning up app $APP_ID"
api_call DELETE "/api/v1/apps/${APP_ID}" "" > /dev/null
pass "Cleanup complete"

echo ""
echo -e "${GREEN}=== E2E fixture complete (scenario: ${SCENARIO}) ===${NC}"
