import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, gt } from "drizzle-orm";

const app = new Hono();

app.post("/push", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const body = await c.req.json<{ table: string; records: any[] }[]>();

  const results: { table: string; records: { id: string; status: string }[] }[] = [];

  for (const group of body) {
    const { table, records } = group;
    const tableSchema = table === "students" ? schema.students :
                        table === "courses" ? schema.courses : null;

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

  const [studentsResult, coursesResult] = await Promise.all([
    db
      .select()
      .from(schema.students)
      .where(and(eq(schema.students.orgId, orgId), gt(schema.students.updatedAt, sinceDate.toISOString()))),
    db
      .select()
      .from(schema.courses)
      .where(and(eq(schema.courses.orgId, orgId), gt(schema.courses.updatedAt, sinceDate.toISOString()))),
  ]);

  return c.json({
    students: studentsResult,
    courses: coursesResult,
  });
});

export default app;
