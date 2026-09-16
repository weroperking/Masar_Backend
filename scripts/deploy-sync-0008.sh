#!/usr/bin/env bash
set -euo pipefail

# 1. Verify DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it before running this script."
  exit 1
fi

# 2. Confirm table state before migrating
echo "--- Checking current schema ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('sync_keys','sync_device_keys','sync_idempotency_keys')
  ORDER BY tablename;
"

# 3. Apply only migration 0008, not all pending migrations
echo "--- Applying 0008 ---"
psql "$DATABASE_URL" -f drizzle/0008_sparkling_dawn.sql

# 4. Verify tables were created
echo "--- Verifying ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('sync_keys','sync_device_keys','sync_idempotency_keys')
  ORDER BY tablename;
"

# 5. Deploy the Worker
echo "--- Deploying Worker ---"
npm run deploy

# 6. Confirm the deployed version is live
echo "--- Checking handshake endpoint is reachable ---"
curl -sS -o /dev/null -w "%{http_code}\n" \
  -X POST https://masar-api.weroperking.workers.dev/api/sync/handshake \
  -H "Content-Type: application/json" \
  -d '{"devicePublicKey":"test"}'

echo "Done. Expect 401 or 400 here (missing token), not 404 or 500."
