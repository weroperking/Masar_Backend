import { pgTable, text, timestamp, uuid, varchar, integer, boolean, index, json } from "drizzle-orm/pg-core";

const baseColumns = {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
};

export const students = pgTable("students", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 50 }),
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  leadSource: varchar("lead_source", { length: 100 }),
  parentName: varchar("parent_name", { length: 255 }),
  parentPhone: varchar("parent_phone", { length: 50 }),
  school: varchar("school", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).default("active"),
}, (table) => ({
  orgIdIdx: index("students_org_id_idx").on(table.orgId),
}));

export const courses = pgTable("courses", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  price: integer("price").notNull().default(0),
  paymentType: varchar("payment_type", { length: 50 }).notNull().default("monthly"),
  status: varchar("status", { length: 50 }).default("active"),
}, (table) => ({
  orgIdIdx: index("courses_org_id_idx").on(table.orgId),
}));

export const groups = pgTable("groups", {
  ...baseColumns,
  courseId: text("course_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("in_person"),
  daysOfWeek: json("days_of_week").$type<string[]>(),
  startTime: varchar("start_time", { length: 50 }),
  endTime: varchar("end_time", { length: 50 }),
  startDate: varchar("start_date", { length: 50 }),
  endDate: varchar("end_date", { length: 50 }),
  sessionCount: integer("session_count"),
  maxStudents: integer("max_students"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).default("scheduled"),
}, (table) => ({
  orgIdIdx: index("groups_org_id_idx").on(table.orgId),
  courseIdIdx: index("groups_course_id_idx").on(table.courseId),
}));

export const attendanceSessions = pgTable("attendance_sessions", {
  ...baseColumns,
  groupId: text("group_id").notNull(),
  courseId: text("course_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  room: varchar("room", { length: 100 }),
  status: varchar("status", { length: 50 }).default("live"),
}, (table) => ({
  orgIdIdx: index("attendance_sessions_org_id_idx").on(table.orgId),
  groupIdIdx: index("attendance_sessions_group_id_idx").on(table.groupId),
}));

export const attendanceRecords = pgTable("attendance_records", {
  ...baseColumns,
  sessionId: text("session_id").notNull(),
  studentId: text("student_id").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  markedAt: timestamp("marked_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => ({
  orgIdIdx: index("attendance_records_org_id_idx").on(table.orgId),
  sessionIdIdx: index("attendance_records_session_id_idx").on(table.sessionId),
  studentIdIdx: index("attendance_records_student_id_idx").on(table.studentId),
}));

export const assessments = pgTable("assessments", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  courseId: text("course_id").notNull(),
  semester: varchar("semester", { length: 100 }),
  date: varchar("date", { length: 50 }),
  maxGrade: integer("max_grade"),
  gradingMethod: varchar("grading_method", { length: 50 }).notNull().default("numeric"),
  status: varchar("status", { length: 50 }).default("draft"),
}, (table) => ({
  orgIdIdx: index("assessments_org_id_idx").on(table.orgId),
  courseIdIdx: index("assessments_course_id_idx").on(table.courseId),
}));

export const assessmentGrades = pgTable("assessment_grades", {
  ...baseColumns,
  assessmentId: text("assessment_id").notNull(),
  studentId: text("student_id").notNull(),
  grade: text("grade"),
  gradedAt: timestamp("graded_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => ({
  orgIdIdx: index("assessment_grades_org_id_idx").on(table.orgId),
  assessmentIdIdx: index("assessment_grades_assessment_id_idx").on(table.assessmentId),
  studentIdIdx: index("assessment_grades_student_id_idx").on(table.studentId),
}));

export const sessionPayments = pgTable("session_payments", {
  ...baseColumns,
  studentId: text("student_id").notNull(),
  courseId: text("course_id").notNull(),
  sessionId: text("session_id"),
  type: varchar("type", { length: 50 }).notNull().default("fee"),
  amount: integer("amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  date: varchar("date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("unpaid"),
}, (table) => ({
  orgIdIdx: index("session_payments_org_id_idx").on(table.orgId),
  studentIdIdx: index("session_payments_student_id_idx").on(table.studentId),
  courseIdIdx: index("session_payments_course_id_idx").on(table.courseId),
}));

export const ledgerEntries = pgTable("ledger_entries", {
  ...baseColumns,
  type: varchar("type", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  amount: integer("amount").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  description: text("description"),
  relatedType: varchar("related_type", { length: 50 }).notNull(),
  relatedId: text("related_id"),
}, (table) => ({
  orgIdIdx: index("ledger_entries_org_id_idx").on(table.orgId),
  typeIdx: index("ledger_entries_type_idx").on(table.type),
}));

export const bookingRequests = pgTable("booking_requests", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  courseId: text("course_id").notNull(),
  declaredAmount: integer("declared_amount").notNull(),
  requestDate: varchar("request_date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
}, (table) => ({
  orgIdIdx: index("booking_requests_org_id_idx").on(table.orgId),
  courseIdIdx: index("booking_requests_course_id_idx").on(table.courseId),
}));

export const products = pgTable("products", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  salePrice: integer("sale_price").notNull(),
  costPrice: integer("cost_price").notNull(),
  stockQty: integer("stock_qty").notNull().default(0),
  soldQty: integer("sold_qty").notNull().default(0),
  type: varchar("type", { length: 50 }).notNull().default("other"),
}, (table) => ({
  orgIdIdx: index("products_org_id_idx").on(table.orgId),
}));

export const courseProducts = pgTable("course_products", {
  ...baseColumns,
  courseId: text("course_id").notNull(),
  productId: text("product_id").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(false),
  discountType: varchar("discount_type", { length: 50 }).notNull().default("none"),
  discountValue: integer("discount_value").notNull().default(0),
}, (table) => ({
  orgIdIdx: index("course_products_org_id_idx").on(table.orgId),
  courseIdIdx: index("course_products_course_id_idx").on(table.courseId),
  productIdIdx: index("course_products_product_id_idx").on(table.productId),
}));

export const productSales = pgTable("product_sales", {
  ...baseColumns,
  productId: text("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  studentId: text("student_id"),
  discountType: varchar("discount_type", { length: 50 }).notNull().default("none"),
  discountValue: integer("discount_value").notNull().default(0),
  subtotal: integer("subtotal").notNull(),
  total: integer("total").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  saleDate: varchar("sale_date", { length: 50 }).notNull(),
  receiptNumber: varchar("receipt_number", { length: 100 }).notNull(),
  linkedEventId: text("linked_event_id"),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("product_sales_org_id_idx").on(table.orgId),
  productIdIdx: index("product_sales_product_id_idx").on(table.productId),
  studentIdIdx: index("product_sales_student_id_idx").on(table.studentId),
}));

export const events = pgTable("events", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("events_org_id_idx").on(table.orgId),
}));

export const users = pgTable("users", {
  ...baseColumns,
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  branch: varchar("branch", { length: 100 }).notNull(),
  linkedEmployeeName: varchar("linked_employee_name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active").notNull(),
}, (table) => ({
  orgIdIdx: index("users_org_id_idx").on(table.orgId),
  emailIdx: index("users_email_idx").on(table.email),
}));

export const messageTemplates = pgTable("message_templates", {
  ...baseColumns,
  channel: varchar("channel", { length: 50 }).notNull(),
  templateKey: varchar("template_key", { length: 100 }).notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
}, (table) => ({
  orgIdIdx: index("message_templates_org_id_idx").on(table.orgId),
  templateKeyIdx: index("message_templates_template_key_idx").on(table.templateKey),
}));

export const settings = pgTable("settings", {
  ...baseColumns,
  autoStartEndSessions: boolean("auto_start_end_sessions").notNull().default(false),
  autoConfirmPaymentOnAttendance: boolean("auto_confirm_payment_on_attendance").notNull().default(false),
  autoCreateAssignmentPerSession: boolean("auto_create_assignment_per_session").notNull().default(false),
  freeSessionLimitPerStudent: integer("free_session_limit_per_student").notNull().default(0),
  assignmentGradingMethod: varchar("assignment_grading_method", { length: 50 }).notNull().default("numeric"),
  numericMaxGrade: integer("numeric_max_grade").notNull().default(100),
}, (table) => ({
  orgIdIdx: index("settings_org_id_idx").on(table.orgId),
}));

export const qrCards = pgTable("qr_cards", {
  ...baseColumns,
  cardNumber: varchar("card_number", { length: 100 }).notNull(),
  studentId: text("student_id"),
  printStatus: varchar("print_status", { length: 50 }).default("available").notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true, mode: "string" }),
}, (table) => ({
  orgIdIdx: index("qr_cards_org_id_idx").on(table.orgId),
  cardNumberIdx: index("qr_cards_card_number_idx").on(table.cardNumber),
  studentIdIdx: index("qr_cards_student_id_idx").on(table.studentId),
}));

export const monthlySubscriptions = pgTable("monthly_subscriptions", {
  ...baseColumns,
  studentId: text("student_id").notNull(),
  courseId: text("course_id").notNull(),
  startDate: varchar("start_date", { length: 50 }).notNull(),
  endDate: varchar("end_date", { length: 50 }).notNull(),
  amount: integer("amount").notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("monthly_subscriptions_org_id_idx").on(table.orgId),
  studentIdIdx: index("monthly_subscriptions_student_id_idx").on(table.studentId),
  courseIdIdx: index("monthly_subscriptions_course_id_idx").on(table.courseId),
}));

export const payments = pgTable("payments", {
  ...baseColumns,
  studentId: text("student_id").notNull(),
  courseId: text("course_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amountTotal: integer("amount_total").notNull(),
  amountPaid: integer("amount_paid").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("partial"),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("payments_org_id_idx").on(table.orgId),
  studentIdIdx: index("payments_student_id_idx").on(table.studentId),
  courseIdIdx: index("payments_course_id_idx").on(table.courseId),
}));

export const allTables = {
  students,
  courses,
  groups,
  attendanceSessions,
  attendanceRecords,
  assessments,
  assessmentGrades,
  sessionPayments,
  ledgerEntries,
  bookingRequests,
  products,
  courseProducts,
  productSales,
  events,
  users,
  messageTemplates,
  settings,
  qrCards,
  monthlySubscriptions,
  payments,
};

export type AllTables = typeof allTables;
export type TableName = keyof AllTables;
