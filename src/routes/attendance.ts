import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull, inArray } from "drizzle-orm";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/sessions", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;

  const result = await db
    .select()
    .from(schema.attendanceSessions)
    .where(and(eq(schema.attendanceSessions.orgId, orgId), isNull(schema.attendanceSessions.deletedAt)));

  return c.json({ sessions: result });
});

app.post("/sessions", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const body = await c.req.json<{
    groupId: string;
    courseId: string;
    startedAt: string;
    endedAt?: string;
    room?: string;
    status?: string;
  }>();

  const now = new Date().toISOString();

  const [session] = await db
    .insert(schema.attendanceSessions)
    .values({
      id: globalThis.crypto.randomUUID(),
      orgId,
      groupId: body.groupId,
      courseId: body.courseId,
      startedAt: body.startedAt,
      endedAt: body.endedAt || null,
      room: body.room || null,
      status: body.status || "live",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ session }, 201);
});

app.patch("/sessions/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    groupId: string;
    courseId: string;
    startedAt: string;
    endedAt: string;
    room: string;
    status: string;
  }>>();

  const [updated] = await db
    .update(schema.attendanceSessions)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.attendanceSessions.id, id), eq(schema.attendanceSessions.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ session: updated });
});

app.delete("/sessions/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [updated] = await db
    .update(schema.attendanceSessions)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.attendanceSessions.id, id), eq(schema.attendanceSessions.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ success: true });
});

app.get("/sessions/:id/records", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const sessionId = c.req.param("id");

  const records = await db
    .select()
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.sessionId, sessionId),
        eq(schema.attendanceRecords.orgId, orgId),
        isNull(schema.attendanceRecords.deletedAt),
      ),
    );

  return c.json({ records });
});

app.post("/sessions/:sessionId/records/batch", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json<{ records: { studentId: string; status: string }[] }>();

  if (!body.records || !Array.isArray(body.records)) {
    return c.json({ error: "records array required" }, 400);
  }

  const now = new Date().toISOString();
  const results: { studentId: string; status: string; action: string }[] = [];

  for (const record of body.records) {
    if (!record.studentId || !record.status) {
      results.push({ studentId: record.studentId || "", status: record.status || "", action: "skipped:missing_fields" });
      continue;
    }

    const validStatuses = ["present", "absent", "late", "excused"];
    if (!validStatuses.includes(record.status)) {
      results.push({ studentId: record.studentId, status: record.status, action: `skipped:invalid_status:${record.status}` });
      continue;
    }

    const existing = await db
      .select()
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.sessionId, sessionId),
          eq(schema.attendanceRecords.studentId, record.studentId),
          eq(schema.attendanceRecords.orgId, orgId),
          isNull(schema.attendanceRecords.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.attendanceRecords)
        .set({ status: record.status, updatedAt: now })
        .where(eq(schema.attendanceRecords.id, existing[0].id));

      results.push({ studentId: record.studentId, status: record.status, action: "updated" });
    } else {
      await db.insert(schema.attendanceRecords).values({
        id: globalThis.crypto.randomUUID(),
        orgId,
        sessionId,
        studentId: record.studentId,
        status: record.status,
        markedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ studentId: record.studentId, status: record.status, action: "created" });
    }
  }

  return c.json({ results });
});

app.post("/records", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const body = await c.req.json<{
    sessionId: string;
    studentId: string;
    status: string;
    markedAt?: string;
  }>();

  const now = new Date().toISOString();

  const [record] = await db
    .insert(schema.attendanceRecords)
    .values({
      id: globalThis.crypto.randomUUID(),
      orgId,
      sessionId: body.sessionId,
      studentId: body.studentId,
      status: body.status,
      markedAt: body.markedAt || now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ record }, 201);
});

app.patch("/records/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{ status: string; markedAt: string }>>();

  const [updated] = await db
    .update(schema.attendanceRecords)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.attendanceRecords.id, id), eq(schema.attendanceRecords.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Record not found" }, 404);
  }

  return c.json({ record: updated });
});

app.delete("/records/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [updated] = await db
    .update(schema.attendanceRecords)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.attendanceRecords.id, id), eq(schema.attendanceRecords.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Record not found" }, 404);
  }

  return c.json({ success: true });
});

export default app;
