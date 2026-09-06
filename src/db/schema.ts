import { pgTable, text, timestamp, uuid, varchar, integer, index, boolean, jsonb } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

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
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  price: integer("price").notNull().default(0),
  paymentType: varchar("payment_type", { length: 50 }).notNull().default("monthly"),
  status: varchar("status", { length: 50 }).default("active"),
}, (table) => ({
  orgIdIdx: index("courses_org_id_idx").on(table.orgId),
}));

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  courseId: text("course_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  daysOfWeek: jsonb("days_of_week").$type<string[]>().notNull().default([]),
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
}));

export const attendanceSessions = pgTable("attendance_sessions", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  groupId: text("group_id").notNull(),
  courseId: text("course_id").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
  room: varchar("room", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("live"),
}, (table) => ({
  orgIdIdx: index("attendance_sessions_org_id_idx").on(table.orgId),
}));

export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  sessionId: text("session_id").notNull(),
  studentId: text("student_id").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  markedAt: timestamp("marked_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => ({
  orgIdIdx: index("attendance_records_org_id_idx").on(table.orgId),
}));

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  courseId: text("course_id").notNull(),
  semester: varchar("semester", { length: 100 }),
  date: varchar("date", { length: 50 }),
  maxGrade: integer("max_grade").notNull(),
  gradingMethod: varchar("grading_method", { length: 50 }).notNull().default("numeric"),
  status: varchar("status", { length: 50 }).default("draft"),
}, (table) => ({
  orgIdIdx: index("assessments_org_id_idx").on(table.orgId),
}));

export const assessmentGrades = pgTable("assessment_grades", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  assessmentId: text("assessment_id").notNull(),
  studentId: text("student_id").notNull(),
  grade: text("grade").notNull(),
  gradedAt: timestamp("graded_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => ({
  orgIdIdx: index("assessment_grades_org_id_idx").on(table.orgId),
}));

export const products = pgTable("products", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  salePrice: integer("sale_price").notNull().default(0),
  costPrice: integer("cost_price").notNull().default(0),
  stockQty: integer("stock_qty").notNull().default(0),
  soldQty: integer("sold_qty").notNull().default(0),
  type: varchar("type", { length: 50 }).default("book"),
}, (table) => ({
  orgIdIdx: index("products_org_id_idx").on(table.orgId),
}));

export const courseProducts = pgTable("course_products", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  courseId: text("course_id").notNull(),
  productId: text("product_id").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(false),
  discountType: varchar("discount_type", { length: 50 }).notNull().default("none"),
  discountValue: integer("discount_value").notNull().default(0),
}, (table) => ({
  orgIdIdx: index("course_products_org_id_idx").on(table.orgId),
}));

export const sessionPayments = pgTable("session_payments", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  studentId: text("student_id").notNull(),
  courseId: text("course_id").notNull(),
  sessionId: text("session_id"),
  type: varchar("type", { length: 50 }).notNull(),
  amount: integer("amount").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  date: varchar("date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("unpaid"),
}, (table) => ({
  orgIdIdx: index("session_payments_org_id_idx").on(table.orgId),
}));

export const revenueEntries = pgTable("revenue_entries", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  category: varchar("category", { length: 255 }),
  amount: integer("amount").notNull().default(0),
  date: varchar("date", { length: 50 }).notNull(),
  description: text("description"),
  relatedType: varchar("related_type", { length: 50 }),
  relatedId: text("related_id"),
}, (table) => ({
  orgIdIdx: index("revenue_entries_org_id_idx").on(table.orgId),
}));

export const expenseEntries = pgTable("expense_entries", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  category: varchar("category", { length: 255 }),
  amount: integer("amount").notNull().default(0),
  date: varchar("date", { length: 50 }).notNull(),
  description: text("description"),
  relatedType: varchar("related_type", { length: 50 }),
  relatedId: text("related_id"),
}, (table) => ({
  orgIdIdx: index("expense_entries_org_id_idx").on(table.orgId),
}));

export const refundEntries = pgTable("refund_entries", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  category: varchar("category", { length: 255 }),
  amount: integer("amount").notNull().default(0),
  date: varchar("date", { length: 50 }).notNull(),
  description: text("description"),
  relatedType: varchar("related_type", { length: 50 }),
  relatedId: text("related_id"),
}, (table) => ({
  orgIdIdx: index("refund_entries_org_id_idx").on(table.orgId),
}));

export const bookingRequests = pgTable("booking_requests", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  courseId: text("course_id").notNull(),
  declaredAmount: integer("declared_amount").notNull().default(0),
  requestDate: varchar("request_date", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
}, (table) => ({
  orgIdIdx: index("booking_requests_org_id_idx").on(table.orgId),
}));

export const productSales = pgTable("product_sales", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  productId: text("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  studentId: text("student_id"),
  discountType: varchar("discount_type", { length: 50 }).notNull().default("none"),
  discountValue: integer("discount_value").notNull().default(0),
  subtotal: integer("subtotal").notNull().default(0),
  total: integer("total").notNull().default(0),
  paymentMethod: varchar("payment_method", { length: 100 }),
  saleDate: varchar("sale_date", { length: 50 }).notNull(),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  linkedEventId: text("linked_event_id"),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("product_sales_org_id_idx").on(table.orgId),
}));

export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("events_org_id_idx").on(table.orgId),
}));

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  branch: varchar("branch", { length: 255 }),
  linkedEmployeeName: varchar("linked_employee_name", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
}, (table) => ({
  orgIdIdx: index("users_org_id_idx").on(table.orgId),
}));

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  channel: varchar("channel", { length: 50 }).notNull(),
  templateKey: varchar("template_key", { length: 100 }).notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
}, (table) => ({
  orgIdIdx: index("message_templates_org_id_idx").on(table.orgId),
}));

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

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
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  cardNumber: varchar("card_number", { length: 100 }).notNull(),
  studentId: text("student_id"),
  printStatus: varchar("print_status", { length: 50 }).notNull().default("available"),
  linkedAt: timestamp("linked_at", { withTimezone: true, mode: "string" }),
}, (table) => ({
  orgIdIdx: index("qr_cards_org_id_idx").on(table.orgId),
}));

export const monthlySubscriptions = pgTable("monthly_subscriptions", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),

  studentId: text("student_id").notNull(),
  courseId: text("course_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amountTotal: integer("amount_total").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("partial"),
  notes: text("notes"),
}, (table) => ({
  orgIdIdx: index("monthly_subscriptions_org_id_idx").on(table.orgId),
}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type NewAttendanceSession = typeof attendanceSessions.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type AssessmentGrade = typeof assessmentGrades.$inferSelect;
export type NewAssessmentGrade = typeof assessmentGrades.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type CourseProduct = typeof courseProducts.$inferSelect;
export type NewCourseProduct = typeof courseProducts.$inferInsert;
export type SessionPayment = typeof sessionPayments.$inferSelect;
export type NewSessionPayment = typeof sessionPayments.$inferInsert;
export type RevenueEntry = typeof revenueEntries.$inferSelect;
export type NewRevenueEntry = typeof revenueEntries.$inferInsert;
export type ExpenseEntry = typeof expenseEntries.$inferSelect;
export type NewExpenseEntry = typeof expenseEntries.$inferInsert;
export type RefundEntry = typeof refundEntries.$inferSelect;
export type NewRefundEntry = typeof refundEntries.$inferInsert;
export type BookingRequest = typeof bookingRequests.$inferSelect;
export type NewBookingRequest = typeof bookingRequests.$inferInsert;
export type ProductSale = typeof productSales.$inferSelect;
export type NewProductSale = typeof productSales.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type QrCard = typeof qrCards.$inferSelect;
export type NewQrCard = typeof qrCards.$inferInsert;
export type MonthlySubscription = typeof monthlySubscriptions.$inferSelect;
export type NewMonthlySubscription = typeof monthlySubscriptions.$inferInsert;
