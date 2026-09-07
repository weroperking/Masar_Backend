CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"group_id" text NOT NULL,
	"course_id" text NOT NULL,
	"enrolled_at" timestamp with time zone NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "enrollments_org_id_idx" ON "enrollments" USING btree ("org_id");