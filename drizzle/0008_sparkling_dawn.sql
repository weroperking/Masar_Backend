CREATE TABLE IF NOT EXISTS "sync_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL UNIQUE,
	"dek_encrypted" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_keys_org_id_idx" ON "sync_keys" ("org_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_device_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"public_key_hash" text NOT NULL,
	"wrapped_dek" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_device_keys_org_id_idx" ON "sync_device_keys" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_device_keys_pubkey_hash_idx" ON "sync_device_keys" ("public_key_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_device_keys_expires_at_idx" ON "sync_device_keys" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_idempotency_keys" (
	"idempotency_key" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text NOT NULL,
	"server_confirmed_record" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_idempotency_keys_org_id_idx" ON "sync_idempotency_keys" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_idempotency_keys_expires_at_idx" ON "sync_idempotency_keys" ("expires_at");
