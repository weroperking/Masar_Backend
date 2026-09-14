CREATE TABLE "org_upgrade_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"requested_plan" text NOT NULL,
	"current_plan" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "city" text;--> statement-breakpoint
CREATE INDEX "org_upgrade_proposals_org_id_idx" ON "org_upgrade_proposals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "org_upgrade_proposals_status_idx" ON "org_upgrade_proposals" USING btree ("status");