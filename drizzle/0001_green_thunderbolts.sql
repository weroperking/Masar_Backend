CREATE TABLE "assessment_grades" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"assessment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"grade" text,
	"graded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"course_id" text NOT NULL,
	"semester" varchar(100),
	"date" varchar(50),
	"max_grade" integer,
	"grading_method" varchar(50) DEFAULT 'numeric' NOT NULL,
	"status" varchar(50) DEFAULT 'draft'
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"session_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" varchar(50) NOT NULL,
	"marked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"course_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"room" varchar(100),
	"status" varchar(50) DEFAULT 'live'
);
--> statement-breakpoint
CREATE TABLE "booking_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"course_id" text NOT NULL,
	"declared_amount" integer NOT NULL,
	"request_date" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" text NOT NULL,
	"product_id" text NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"discount_type" varchar(50) DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"date" varchar(50) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'in_person' NOT NULL,
	"days_of_week" json,
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
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"type" varchar(50) NOT NULL,
	"category" varchar(100),
	"amount" integer NOT NULL,
	"date" varchar(50) NOT NULL,
	"description" text,
	"related_type" varchar(50) NOT NULL,
	"related_id" text
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"channel" varchar(50) NOT NULL,
	"template_key" varchar(100) NOT NULL,
	"body" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"start_date" varchar(50) NOT NULL,
	"end_date" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount_total" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'partial' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"student_id" text,
	"discount_type" varchar(50) DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL,
	"total" integer NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"sale_date" varchar(50) NOT NULL,
	"receipt_number" varchar(100) NOT NULL,
	"linked_event_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"sale_price" integer NOT NULL,
	"cost_price" integer NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"sold_qty" integer DEFAULT 0 NOT NULL,
	"type" varchar(50) DEFAULT 'other' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"card_number" varchar(100) NOT NULL,
	"student_id" text,
	"print_status" varchar(50) DEFAULT 'available' NOT NULL,
	"linked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"session_id" text,
	"type" varchar(50) DEFAULT 'fee' NOT NULL,
	"amount" integer NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"date" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'unpaid'
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"auto_start_end_sessions" boolean DEFAULT false NOT NULL,
	"auto_confirm_payment_on_attendance" boolean DEFAULT false NOT NULL,
	"auto_create_assignment_per_session" boolean DEFAULT false NOT NULL,
	"free_session_limit_per_student" integer DEFAULT 0 NOT NULL,
	"assignment_grading_method" varchar(50) DEFAULT 'numeric' NOT NULL,
	"numeric_max_grade" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"branch" varchar(100) NOT NULL,
	"linked_employee_name" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "assessment_grades_org_id_idx" ON "assessment_grades" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "assessment_grades_assessment_id_idx" ON "assessment_grades" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_grades_student_id_idx" ON "assessment_grades" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assessments_org_id_idx" ON "assessments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "assessments_course_id_idx" ON "assessments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "attendance_records_org_id_idx" ON "attendance_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_org_id_idx" ON "attendance_sessions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_group_id_idx" ON "attendance_sessions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "booking_requests_org_id_idx" ON "booking_requests" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "booking_requests_course_id_idx" ON "booking_requests" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_products_org_id_idx" ON "course_products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "course_products_course_id_idx" ON "course_products" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_products_product_id_idx" ON "course_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "events_org_id_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "groups_org_id_idx" ON "groups" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "groups_course_id_idx" ON "groups" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_org_id_idx" ON "ledger_entries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_type_idx" ON "ledger_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "message_templates_org_id_idx" ON "message_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "message_templates_template_key_idx" ON "message_templates" USING btree ("template_key");--> statement-breakpoint
CREATE INDEX "monthly_subscriptions_org_id_idx" ON "monthly_subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "monthly_subscriptions_student_id_idx" ON "monthly_subscriptions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "monthly_subscriptions_course_id_idx" ON "monthly_subscriptions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "payments_org_id_idx" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "payments_student_id_idx" ON "payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payments_course_id_idx" ON "payments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "product_sales_org_id_idx" ON "product_sales" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "product_sales_product_id_idx" ON "product_sales" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_sales_student_id_idx" ON "product_sales" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "products_org_id_idx" ON "products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "qr_cards_org_id_idx" ON "qr_cards" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "qr_cards_card_number_idx" ON "qr_cards" USING btree ("card_number");--> statement-breakpoint
CREATE INDEX "qr_cards_student_id_idx" ON "qr_cards" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "session_payments_org_id_idx" ON "session_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "session_payments_student_id_idx" ON "session_payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "session_payments_course_id_idx" ON "session_payments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "settings_org_id_idx" ON "settings" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "users_org_id_idx" ON "users" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");