import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { Student, NewStudent } from "../db/schema";
import { PLAN_LIMITS } from "../config/plans";
import type { PlanKey } from "../config/plans";
import type { EffectiveSubscription } from "../lib/subscriptions";

const app = new Hono();

app.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");

  const result = await db
    .select()
    .from(schema.students)
    .where(and(eq(schema.students.orgId, orgId), isNull(schema.students.deletedAt)));

  return c.json({ students: result });
});

app.post("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const body = await c.req.json<NewStudent>();

  const subscription = c.get("subscription") as EffectiveSubscription;

  if (subscription) {
    const planKey = subscription.plan as PlanKey;
    const limits = PLAN_LIMITS[planKey];
    const maxStudents = limits?.max_students;

    if (maxStudents !== null && maxStudents !== undefined) {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.students)
        .where(and(eq(schema.students.orgId, orgId), isNull(schema.students.deletedAt)));

      const currentCount = Number(countResult[0]?.count ?? 0);
      if (currentCount >= maxStudents) {
        return c.json(
          {
            error: "LIMIT_REACHED",
            limit: maxStudents,
            current: currentCount,
            plan: subscription.plan,
          },
          403,
        );
      }
    }
  }

  const student = {
    id: body.id || globalThis.crypto.randomUUID(),
    ...body,
    orgId,
    updatedAt: new Date().toISOString(),
  };

  const result = await db.insert(schema.students).values(student).returning();

  return c.json({ student: result[0] }, 201);
});

app.get("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const result = await db
    .select()
    .from(schema.students)
    .where(and(eq(schema.students.id, id), eq(schema.students.orgId, orgId)));

  if (result.length === 0) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ student: result[0] });
});

app.patch("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const body = await c.req.json<Partial<Student>>();

  const result = await db
    .update(schema.students)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.students.id, id), eq(schema.students.orgId, orgId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ student: result[0] });
});

app.delete("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const result = await db
    .update(schema.students)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.students.id, id), eq(schema.students.orgId, orgId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ success: true });
});

app.post("/:id/lookup-token", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const existing = await db
    .select()
    .from(schema.students)
    .where(and(eq(schema.students.id, id), eq(schema.students.orgId, orgId)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: "Student not found" }, 404);
  }

  const token = globalThis.crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db
    .update(schema.students)
    .set({ publicLookupToken: token, updatedAt: now })
    .where(and(eq(schema.students.id, id), eq(schema.students.orgId, orgId)))
    .returning();

  const url = `https://masar.app/s/${token}`;

  return c.json({ token: result[0].publicLookupToken, url });
});

export default app;

