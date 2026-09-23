-- Migration: Add sync fields to qr_cards and monthly_subscriptions
-- The schema.ts was updated to add columns that the frontend sends,
-- but no migration was applied to the actual database.
-- This migration adds the missing columns and relaxes NOT NULL constraints.

-- === qr_cards ===
-- Add frontend-sent columns that were missing from the DB schema
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "qr_code_data" text;
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'queued';
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "theme_color" varchar(50);
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "center_name" varchar(255);
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "background_image" text;
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "qr_cards" ADD COLUMN IF NOT EXISTS "sync_status" varchar(50) DEFAULT 'pending';
--> statement-breakpoint

-- === monthly_subscriptions ===
-- Relax NOT NULL constraints: Path A (pricing updates) doesn't send studentId/courseId
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "student_id" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "course_id" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "month" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "amount_total" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "amount_paid" DROP NOT NULL;
ALTER TABLE "monthly_subscriptions" ALTER COLUMN "status" DROP NOT NULL;

-- Add columns from schema.ts that don't exist in the old DB
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "start_date" varchar(50);
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "end_date" varchar(50);
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "amount" integer DEFAULT 0;
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "due_date" varchar(50);
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "payment_method" varchar(50) DEFAULT 'cash';
ALTER TABLE "monthly_subscriptions" ADD COLUMN IF NOT EXISTS "sync_status" varchar(50) DEFAULT 'pending';
--> statement-breakpoint
