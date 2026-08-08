#!/bin/sh
# Railway start script — detects which service this is and runs the right command.
# Railway sets RAILWAY_SERVICE_NAME automatically.
set -eu

service_role="${SERVICE_ROLE:-${RAILWAY_SERVICE_NAME:-web}}"
case "$service_role" in
api|api-server|*-api)
  echo "[Nodsend] Applying database migrations..."
  ./node_modules/.bin/prisma migrate deploy --schema api-server/prisma/schema.prisma
  echo "[Nodsend] Starting API server..."
  exec node api-server/server.js
  ;;
*)
  echo "[Nodsend] Starting web server..."
  exec ./node_modules/.bin/next start -p "${PORT:-3000}"
  ;;
esac
