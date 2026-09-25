-- Migration: Replace the insecure public_lookup_token (a plain, org-unscoped
-- crypto.randomUUID()) with a per-org, per-student lookup_code that encodes
-- BOTH the org and the student as base64url("<lookup_prefix>:<student_id>").
--
-- lookup_prefix is a random, unique, non-guessable string generated per org
-- (via crypto.getRandomValues in the worker). The ":" delimiter cannot occur
-- inside lookup_prefix (random base64url) or inside student.id (a UUID), so it
-- is a safe split point on decode.
--
-- Old, enumerable / org-unscoped links (/p/s/<uuid> or the frontend's
-- /p/s/<studentCode> such as /p/s/0004) are fully replaced by this scheme.
-- The old public_lookup_token column is dropped; its DB-level index is removed.

-- === subscriptions: add lookup_prefix ===
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "lookup_prefix" text;

-- Backfill existing orgs with a random, unique, non-guessable prefix.
-- gen_random_uuid() is built-in (no extension required on Neon/Postgres >= 13).
-- uuid_send() returns the 16 binary bytes of the UUID as bytea.
-- 16 bytes of randomness is more than sufficient; uniqueness is enforced by
-- the constraint added below.
UPDATE "subscriptions"
   SET "lookup_prefix" = encode(uuid_send(gen_random_uuid()), 'base64')
 WHERE "lookup_prefix" IS NULL;

ALTER TABLE "subscriptions" ALTER COLUMN "lookup_prefix" SET NOT NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lookup_prefix_unique" UNIQUE ("lookup_prefix");
CREATE INDEX IF NOT EXISTS "subscriptions_lookup_prefix_idx" ON "subscriptions" USING btree ("lookup_prefix");

-- === students: replace public_lookup_token with lookup_code ===
-- lookup_code = base64url of the UTF-8 bytes of "<lookup_prefix>:<student_id>",
-- which is exactly what encodeLookupCode() in src/lib/lookup.ts produces.
-- PG's encode(...,'base64') is standard base64; we translate to url-safe and
-- strip padding to match the worker-side base64url output.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "lookup_code" text;

UPDATE "students" AS s
   SET "lookup_code" = rtrim(
         translate(
           replace(encode(convert_to(concat(sub."lookup_prefix", ':', s."id")::text, 'UTF8'), 'base64'), E'\n', ''),
           '+/', '-_'
         ), '='
       )
  FROM "subscriptions" AS sub
 WHERE sub."org_id" = s."org_id"
   AND s."lookup_code" IS NULL;

-- Degenerate guard: students whose org has no subscription row (orphan).
-- They can never resolve at the public endpoint (no prefix matches), so this
-- is just to satisfy NOT NULL. Make it url-safe & unique per student id.
UPDATE "students" AS s
   SET "lookup_code" = rtrim(
         translate(
           replace(encode(convert_to(s."id"::text, 'UTF8'), 'base64'), E'\n', ''),
           '+/', '-_'
         ), '='
       )
 WHERE s."lookup_code" IS NULL;

ALTER TABLE "students" ALTER COLUMN "lookup_code" SET NOT NULL;
ALTER TABLE "students" ADD CONSTRAINT "students_lookup_code_unique" UNIQUE ("lookup_code");
CREATE INDEX IF NOT EXISTS "students_lookup_code_idx" ON "students" USING btree ("lookup_code");

-- Remove the old, insecure column + its index entirely.
DROP INDEX IF EXISTS "students_public_lookup_token_idx";
ALTER TABLE "students" DROP COLUMN IF EXISTS "public_lookup_token";
--> statement-breakpoint
