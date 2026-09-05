import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import type { Course, NewCourse } from "../db/schema";

const app = new Hono();

app.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");

  const result = await db
    .select()
    .from(schema.courses)
    .where(and(eq(schema.courses.orgId, orgId), isNull(schema.courses.deletedAt)));

  return c.json({ courses: result });
});

app.post("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const body = await c.req.json<NewCourse>();

  const course = {
    ...body,
    orgId,
    updatedAt: new Date().toISOString(),
  };

  const result = await db.insert(schema.courses).values(course).returning();

  return c.json({ course: result[0] }, 201);
});

app.get("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const result = await db
    .select()
    .from(schema.courses)
    .where(and(eq(schema.courses.id, id), eq(schema.courses.orgId, orgId)));

  if (result.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  return c.json({ course: result[0] });
});

app.patch("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const body = await c.req.json<Partial<Course>>();

  const result = await db
    .update(schema.courses)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.courses.id, id), eq(schema.courses.orgId, orgId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  return c.json({ course: result[0] });
});

app.delete("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const id = c.req.param("id");

  const result = await db
    .update(schema.courses)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.courses.id, id), eq(schema.courses.orgId, orgId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Course not found" }, 404);
  }

  return c.json({ success: true });
});

export default app;
