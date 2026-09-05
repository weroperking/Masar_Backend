import { pgTable, text, timestamp, uuid, varchar, integer, index } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: uuid("id").primaryKey(),
  orgId: text("org_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),

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

  name: varchar("name", { length: 255 }).notNull(),
  price: integer("price").notNull().default(0),
  paymentType: varchar("payment_type", { length: 50 }).notNull().default("monthly"),
  status: varchar("status", { length: 50 }).default("active"),
}, (table) => ({
  orgIdIdx: index("courses_org_id_idx").on(table.orgId),
}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
