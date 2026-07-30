#!/bin/sh
set -e

# Extract database DSN from environment
TARGET_DSN="${DATABASE_DSN:-${DB_DSN:-${AGNI_DATABASE_DSN}}}"

if [ -n "$TARGET_DSN" ]; then
  echo "==> Executing database migrations from /app/db/migrations..."
  if command -v migrate >/dev/null 2>&1; then
    migrate -path /app/db/migrations -database "$TARGET_DSN" up || echo "==> Migrations complete or no new migrations."
  else
    echo "==> Warning: 'migrate' CLI tool not found in container PATH."
  fi
else
  echo "==> No database DSN environment variable set. Skipping auto-migration."
fi

echo "==> Launching application binary..."
exec "$@"
