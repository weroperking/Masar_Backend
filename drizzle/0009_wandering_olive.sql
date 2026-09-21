ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "booking_code" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_booking_code_idx" ON "subscriptions" ("booking_code");
--> statement-breakpoint
UPDATE "subscriptions" SET "booking_code" = substr(md5(random()::text || clock_timestamp()::text), 1, 8) WHERE "booking_code" IS NULL;
