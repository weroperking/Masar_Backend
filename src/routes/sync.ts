import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { allTables, type TableName } from "../db/schema";

const app = new Hono();

const syncableTables: TableName[] = [
  "students",
  "courses",
  "groups",
  "attendanceSessions",
  "attendanceRecords",
  "assessments",
  "assessmentGrades",
  "sessionPayments",
  "ledgerEntries",
  "bookingRequests",
  "products",
  "courseProducts",
  "productSales",
  "events",
  "users",
  "messageTemplates",
  "settings",
  "qrCards",
  "monthlySubscriptions",
  "payments",
];

const tableToColumnName: Record<string, string> = {};

app.post("/push", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const body = await c.req.json<{ table: string; records: any[] }[]>();

  const results: { table: string; records: { id: string; status: string }[] }[] = [];

  for (const group of body) {
    const { table: tableName, records } = group;
    const tableObj = allTables[tableName as TableName] as any;

    if (!tableObj) {
      results.push({ table: tableName, records: records.map(r => ({ id: r.id, status: "error: unknown table" })) });
      continue;
    }

    const recordResults: { id: string; status: string }[] = [];

    for (const record of records) {
      const { id, updated_at, ...data } = record;

      const existing = await db
        .select()
        .from(tableObj)
        .where(and(eq(tableObj.id, id), eq(tableObj.orgId, orgId)));

      if (existing.length > 0) {
        const existingUpdatedAt = new Date(existing[0].updatedAt).getTime();
        const incomingUpdatedAt = new Date(updated_at).getTime();

        if (incomingUpdatedAt > existingUpdatedAt) {
          await db
            .update(tableObj)
            .set({ ...data, updatedAt: updated_at, deletedAt: null })
            .where(and(eq(tableObj.id, id), eq(tableObj.orgId, orgId)));
          recordResults.push({ id, status: "updated" });
        } else {
          recordResults.push({ id, status: "skipped" });
        }
      } else {
        await db.insert(tableObj).values({
          ...data,
          id,
          orgId,
          updatedAt: updated_at,
          deletedAt: null,
        });
        recordResults.push({ id, status: "created" });
      }
    }

    results.push({ table: tableName, records: recordResults });
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
  const result: Record<string, any[]> = {};

  await Promise.all(
    syncableTables.map(async (tableName) => {
      const tableObj = allTables[tableName] as any;

      const records = await db
        .select()
        .from(tableObj)
        .where(and(eq(tableObj.orgId, orgId), gt(tableObj.updatedAt, sinceDate.toISOString())));

      result[tableName] = records;
    })
  );

  return c.json(result);
});

export default app;
