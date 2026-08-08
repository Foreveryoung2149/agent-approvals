#!/bin/sh
# Railway start script — detects which service this is and runs the right command.
# Railway sets RAILWAY_SERVICE_NAME automatically.
if [ "$RAILWAY_SERVICE_NAME" = "api" ]; then
  echo "[Agent Approvals] Starting API server..."
  npx prisma generate --schema api-server/prisma/schema.prisma
  npx prisma db push --accept-data-loss --schema api-server/prisma/schema.prisma
  node api-server/server.js
else
  echo "[Agent Approvals] Starting web server..."
  npx next start -p $PORT
fi