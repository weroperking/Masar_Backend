#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it before running."
  echo "  export DATABASE_URL=\"postgresql://user:pass@host/db\""
  exit 1
fi

echo "--- Tables before ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('sync_keys','sync_device_keys','sync_idempotency_keys')
  ORDER BY tablename;"

echo "--- Applying 0008 (idempotent) ---"
psql "$DATABASE_URL" -f drizzle/0008_sparkling_dawn.sql

echo "--- Tables after ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('sync_keys','sync_device_keys','sync_idempotency_keys')
  ORDER BY tablename;"

echo "--- Deploying Worker ---"
npm run deploy

echo "--- Handshake reachable? ---"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST https://masar-api.weroperking.workers.dev/api/sync/handshake \
  -H "Content-Type: application/json" \
  -d '{"devicePublicKey":"test"}'

echo "Done. Expect 401 or 400 from the curl (no token sent)."
echo "Then open the app and check DevTools Network for a 200 on /api/sync/handshake with wrappedDek in the body."
