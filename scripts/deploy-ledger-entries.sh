#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it first."
  exit 1
fi

LEDGER_MIGRATION="drizzle/0010_ledger_entries.sql"
REGISTER_0009="${REGISTER_0009:-0}"

echo "--- Tables before ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('ledger_entries','sync_keys');"

if [[ "$REGISTER_0009" == "1" ]]; then
  echo "--- Applying 0009 (previously unregistered) ---"
  psql "$DATABASE_URL" -f drizzle/0009_wandering_olive.sql
fi

echo "--- Applying ledger migration ---"
psql "$DATABASE_URL" -f "$LEDGER_MIGRATION"

echo "--- Clearing poisoned idempotency cache ---"
psql "$DATABASE_URL" -c "
  DELETE FROM sync_idempotency_keys
  WHERE entity_type = 'ledgerEntries'
    AND status IN ('error', 'error_unknown_entity')
  RETURNING idempotency_key;"

echo "--- Tables after ---"
psql "$DATABASE_URL" -c "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
    AND tablename IN ('ledger_entries','sync_keys');"

echo "--- Deploying Worker ---"
npm run deploy

echo "--- Smoke test ---"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST https://masar-api.weroperking.workers.dev/api/sync/push \
  -H "Content-Type: application/json" \
  -H "X-Sync-Encrypted: true" \
  -d '{"operations":[]}'

echo "Done. Expect 401 or 400 (no auth)."
