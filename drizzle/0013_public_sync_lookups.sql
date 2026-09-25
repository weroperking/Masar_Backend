-- Migration: public_sync_lookups
--
-- Backing store for POST /api/public/sync-lookups (404 until now: the route did
-- not exist on the worker, the frontend's 546-byte payload was rejected by the
-- default notFound handler with a 13-byte text/plain body).
--
-- One row per (org_id, student_id) — the frontend upserts the rendered public
-- student card (student + attendance + exams + subscription) keyed by student
-- and org, so re-posting the same student updates in place instead of appending.
--
-- lookup_code is stored alongside the row (copied from students.lookup_code) so
-- the public reader can serve /p/s/<lookup_code> without a second join.

CREATE TABLE IF NOT EXISTS "public_sync_lookups" (
  "id"            text PRIMARY KEY,
  "org_id"        text NOT NULL,
  "student_id"    text NOT NULL,
  "lookup_code"   text,
  "student"       jsonb,
  "teacher_name"  varchar(255),
  "academy_name"  varchar(255),
  "center_name"   varchar(255),
  "branch"        varchar(255),
  "attendance"    jsonb,
  "exams"         jsonb,
  "subscription"  jsonb,
  "created_at"    timestamptz NOT NULL,
  "updated_at"    timestamptz NOT NULL,
  "deleted_at"    timestamptz
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "public_sync_lookups_org_id_student_id_unique"
  ON "public_sync_lookups" USING btree ("org_id", "student_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "public_sync_lookups_org_id_idx"
  ON "public_sync_lookups" USING btree ("org_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "public_sync_lookups_lookup_code_idx"
  ON "public_sync_lookups" USING btree ("lookup_code");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "public_sync_lookups_updated_at_idx"
  ON "public_sync_lookups" USING btree ("updated_at");
