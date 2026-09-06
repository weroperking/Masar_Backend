CREATE TABLE "assessment_grades" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"assessment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"grade" text NOT NULL,
	"graded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"course_id" text NOT NULL,
	"semester" varchar(100),
	"date" varchar(50),
	"max_grade" integer NOT NULL,
	"grading_method" varchar(50) DEFAULT 'numeric' NOT NULL,
	"status" varchar(50) DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"session_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" varchar(50) NOT NULL,
	"marked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"course_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"room" varchar(255),
	"status" varchar(50) DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"course_id" text NOT NULL,
	"declared_amount" integer DEFAULT 0 NOT NULL,
	"request_date" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"course_id" text NOT NULL,
	"product_id" text NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"discount_type" varchar(50) DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"payment_type" varchar(50) DEFAULT 'monthly' NOT NULL,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"date" varchar(50) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "expense_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"category" varchar(255),
	"amount" integer DEFAULT 0 NOT NULL,
	"date" varchar(50) NOT NULL,
	"description" text,
	"related_type" varchar(50),
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"course_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"days_of_week" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_time" varchar(50),
	"end_time" varchar(50),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"session_count" integer,
	"max_students" integer,
	"notes" text,
	"status" varchar(50) DEFAULT 'scheduled'
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"channel" varchar(50) NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"body" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount_total" integer DEFAULT 0 NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'partial' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"student_id" text,
	"discount_type" varchar(50) DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"payment_method" varchar(100),
	"sale_date" varchar(50) NOT NULL,
	"receipt_number" varchar(100),
	"linked_event_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"sale_price" integer DEFAULT 0 NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"sold_qty" integer DEFAULT 0 NOT NULL,
	"type" varchar(50) DEFAULT 'book'
);
--> statement-breakpoint
CREATE TABLE "qr_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"card_number" varchar(100) NOT NULL,
	"student_id" text,
	"print_status" varchar(50) DEFAULT 'available' NOT NULL,
	"linked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refund_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"category" varchar(255),
	"amount" integer DEFAULT 0 NOT NULL,
	"date" varchar(50) NOT NULL,
	"description" text,
	"related_type" varchar(50),
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "revenue_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"category" varchar(255),
	"amount" integer DEFAULT 0 NOT NULL,
	"date" varchar(50) NOT NULL,
	"description" text,
	"related_type" varchar(50),
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "session_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"session_id" text,
	"type" varchar(50) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"date" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'unpaid' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"auto_start_end_sessions" boolean DEFAULT false NOT NULL,
	"auto_confirm_payment_on_attendance" boolean DEFAULT false NOT NULL,
	"auto_create_assignment_per_session" boolean DEFAULT false NOT NULL,
	"free_session_limit_per_student" integer DEFAULT 0 NOT NULL,
	"assignment_grading_method" varchar(50) DEFAULT 'numeric' NOT NULL,
	"numeric_max_grade" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"branch" varchar(255),
	"linked_employee_name" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "assessment_grades_org_id_idx" ON "assessment_grades" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "assessments_org_id_idx" ON "assessments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "attendance_records_org_id_idx" ON "attendance_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_org_id_idx" ON "attendance_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_requests_org_id_idx" ON "booking_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "course_products_org_id_idx" ON "course_products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "courses_org_id_idx" ON "courses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "events_org_id_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "expense_entries_org_id_idx" ON "expense_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "groups_org_id_idx" ON "groups" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "message_templates_org_id_idx" ON "message_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "monthly_subscriptions_org_id_idx" ON "monthly_subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "product_sales_org_id_idx" ON "product_sales" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "products_org_id_idx" ON "products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "qr_cards_org_id_idx" ON "qr_cards" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "refund_entries_org_id_idx" ON "refund_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "revenue_entries_org_id_idx" ON "revenue_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "session_payments_org_id_idx" ON "session_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "settings_org_id_idx" ON "settings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "students_org_id_idx" ON "students" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" USING btree ("org_id");