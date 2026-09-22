CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "type" text NOT NULL,
  "amount" numeric NOT NULL,
  "description" text,
  "date" timestamp with time zone NOT NULL,
  "related_type" text,
  "related_id" text,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_org_id_idx" ON "ledger_entries" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_date_idx" ON "ledger_entries" ("date");
