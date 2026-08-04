#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "🔥 Agni Local Deployment Test Script"
echo "===================================="

SERVER_URL="http://localhost:8080"

# Check if Agni server is running
if ! curl -s "${SERVER_URL}/health" > /dev/null; then
  echo "🚀 Server not running on ${SERVER_URL}. Building and starting..."
  cd "${ROOT_DIR}"
  crank build
  KUBECONFIG="" ./bin &
  SERVER_PID=$!
  echo "Waiting for server to start (PID: ${SERVER_PID})..."
  sleep 2
fi

echo "📦 Packaging sample UI application from scripts/test-app..."
TMP_TARBALL="$(mktemp /tmp/agni-test-app-XXXXXX.tar.gz)"
COPYFILE_DISABLE=1 tar --exclude='._*' --exclude='.DS_Store' -czf "${TMP_TARBALL}" -C "${SCRIPT_DIR}/test-app" .

echo "📤 Deploying sample UI app to Agni API (POST ${SERVER_URL}/api/v1/apps)..."
RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/v1/apps" \
  -F "owner_email=tester@example.com" \
  -F "name=Agni Interactive UI Demo" \
  -F "tarball=@${TMP_TARBALL}")

rm -f "${TMP_TARBALL}"

APP_ID=$(echo "${RESPONSE}" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "${APP_ID}" ]; then
  echo "❌ Failed to extract App ID from API response:"
  echo "${RESPONSE}"
  exit 1
fi

echo "✅ App deployment initiated! App ID: ${APP_ID}"
echo "⏳ Waiting for deployment pipeline..."
sleep 2

STATUS_RESP=$(curl -s "${SERVER_URL}/api/v1/apps/${APP_ID}")
SERVICE_URL=$(echo "${STATUS_RESP}" | grep -o '"service_url":"[^"]*' | cut -d'"' -f4)
STATUS=$(echo "${STATUS_RESP}" | grep -o '"status":"[^"]*' | cut -d'"' -f4)

echo ""
echo "🎉 Deployment Details:"
echo "----------------------"
echo "  • App ID:      ${APP_ID}"
echo "  • Status:      ${STATUS}"
echo "  • Preview URL: ${SERVER_URL}/preview/${APP_ID}"
echo ""

PREVIEW_URL="${SERVER_URL}/preview/${APP_ID}"

echo "🌐 Opening App UI in your web browser: ${PREVIEW_URL}"
if command -v open > /dev/null 2>&1; then
  open "${PREVIEW_URL}"
elif command -v xdg-open > /dev/null 2>&1; then
  xdg-open "${PREVIEW_URL}"
else
  echo "Please open ${PREVIEW_URL} in your browser to view the UI."
fi

echo ""
echo "✨ Test completed successfully!"
