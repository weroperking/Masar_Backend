CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"payment_type" varchar(50) DEFAULT 'monthly' NOT NULL,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"gender" varchar(50),
	"date_of_birth" varchar(50),
	"phone" varchar(50),
	"email" varchar(255),
	"lead_source" varchar(100),
	"parent_name" varchar(255),
	"parent_phone" varchar(50),
	"school" varchar(255),
	"address" text,
	"notes" text,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE INDEX "courses_org_id_idx" ON "courses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "students_org_id_idx" ON "students" USING btree ("org_id");