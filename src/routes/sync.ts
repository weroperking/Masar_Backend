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
      const { id, updated_at, ...data } = record;

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
            .set({ ...data, updatedAt: updated_at })
            .where(and(eq(tableSchema.id, id), eq(tableSchema.orgId, orgId)));
          recordResults.push({ id, status: "updated" });
        } else {
          recordResults.push({ id, status: "skipped" });
        }
      } else {
        await db.insert(tableSchema).values({
          ...data,
          id,
          orgId,
          updatedAt: updated_at,
          deletedAt: null,
          createdAt: updated_at,
        });
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
