import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, gt } from "drizzle-orm";

const app = new Hono();

const tenantTables: Record<string, any> = {
  students: schema.students,
  courses: schema.courses,
  groups: schema.groups,
  attendanceSessions: schema.attendanceSessions,
  attendanceRecords: schema.attendanceRecords,
  assessments: schema.assessments,
  assessmentGrades: schema.assessmentGrades,
  products: schema.products,
  courseProducts: schema.courseProducts,
  sessionPayments: schema.sessionPayments,
  revenueEntries: schema.revenueEntries,
  expenseEntries: schema.expenseEntries,
  refundEntries: schema.refundEntries,
  bookingRequests: schema.bookingRequests,
  productSales: schema.productSales,
  events: schema.events,
  users: schema.users,
  messageTemplates: schema.messageTemplates,
  settings: schema.settings,
  qrCards: schema.qrCards,
  monthlySubscriptions: schema.monthlySubscriptions,
  enrollments: schema.enrollments,
};

app.post("/push", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const body = await c.req.json<{ table: string; records: any[] }[]>();

  const results: { table: string; records: { id: string; status: string }[] }[] = [];

  for (const group of body) {
    const { table, records } = group;
    const tableSchema = tenantTables[table];

    if (!tableSchema) {
      results.push({ table, records: records.map(r => ({ id: r.id, status: "error: unknown table" })) });
      continue;
    }

    const recordResults: { id: string; status: string }[] = [];

    for (const record of records) {
      const { id, updated_at, deleted_at, ...data } = record;
      const updatedAtStr = typeof updated_at === "number" ? new Date(updated_at).toISOString() : updated_at;
      const deletedAtStr = deleted_at ? (typeof deleted_at === "number" ? new Date(deleted_at).toISOString() : deleted_at) : null;

      const existing = await db
        .select()
        .from(tableSchema)
        .where(and(eq(tableSchema.id, id), eq(tableSchema.orgId, orgId)));

      if (existing.length > 0) {
        const existingUpdatedAt = new Date(existing[0].updatedAt).getTime();
        const incomingUpdatedAt = new Date(updated_at).getTime();

        if (incomingUpdatedAt > existingUpdatedAt) {
          await db
            .update(tableSchema)
            .set({ ...data, updatedAt: updatedAtStr })
            .where(and(eq(tableSchema.id, id), eq(tableSchema.orgId, orgId)));
          recordResults.push({ id, status: "updated" });
        } else {
          recordResults.push({ id, status: "skipped" });
        }
      } else {
        const insertValues: Record<string, any> = {
          ...data,
          id,
          orgId,
          updatedAt: updatedAtStr,
          deletedAt: deletedAtStr,
          createdAt: updatedAtStr,
        };

        if (table === "monthlySubscriptions") {
          const sid = data.studentId || data.student_id;
          const cid = data.courseId || data.course_id;
          if (sid && cid) {
            const [student] = await db
              .select({
                discountType: schema.students.discountType,
                discountValue: schema.students.discountValue,
              })
              .from(schema.students)
              .where(and(eq(schema.students.id, sid), eq(schema.students.orgId, orgId)))
              .limit(1);

            const [course] = await db
              .select({ price: schema.courses.price })
              .from(schema.courses)
              .where(and(eq(schema.courses.id, cid), eq(schema.courses.orgId, orgId)))
              .limit(1);

            const basePrice = Number(course?.price || 0);
            let amount = basePrice;
            if (student?.discountType === "percentage" && student?.discountValue > 0) {
              amount = Math.round(basePrice * (1 - student.discountValue / 100));
            } else if (student?.discountType === "fixed" && student?.discountValue > 0) {
              amount = Math.max(0, basePrice - student.discountValue);
            }
            insertValues.amount = amount;
          }
        }

        await db.insert(tableSchema).values(insertValues);
        recordResults.push({ id, status: "created" });
      }
    }

    results.push({ table, records: recordResults });
  }

  return c.json({ results });
});

app.get("/pull", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const since = c.req.query("since");

  if (!since) {
    return c.json({ error: "Missing 'since' query parameter" }, 400);
  }

  const sinceDate = new Date(since);
  const pullData: Record<string, any[]> = {};

  for (const [name, table] of Object.entries(tenantTables)) {
    try {
      const result = await db
        .select()
        .from(table)
        .where(and(eq(table.orgId, orgId), gt(table.updatedAt, sinceDate.toISOString())));
      pullData[name] = result;
    } catch {
      pullData[name] = [];
    }
  }

  return c.json(pullData);
});

export default app;
