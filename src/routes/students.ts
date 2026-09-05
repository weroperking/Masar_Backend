import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import type { Student, NewStudent } from "../db/schema";

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

  const student = {
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

export default app;
