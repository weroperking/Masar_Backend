import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;

  const result = await db
    .select()
    .from(schema.monthlySubscriptions)
    .where(and(eq(schema.monthlySubscriptions.orgId, orgId), isNull(schema.monthlySubscriptions.deletedAt)));

  return c.json({ monthlySubscriptions: result });
});

app.post("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const body = await c.req.json<{
    studentId: string;
    courseId: string;
    startDate: string;
    endDate: string;
    status?: string;
    paymentMethod?: string;
    notes?: string;
  }>();

  if (!body.studentId || !body.courseId || !body.startDate || !body.endDate) {
    return c.json({ error: "studentId, courseId, startDate, endDate are required" }, 400);
  }

  const now = new Date().toISOString();

  const [student] = await db
    .select({
      discountType: schema.students.discountType,
      discountValue: schema.students.discountValue,
    })
    .from(schema.students)
    .where(and(eq(schema.students.id, body.studentId), eq(schema.students.orgId, orgId)))
    .limit(1);

  if (!student) {
    return c.json({ error: "Student not found" }, 404);
  }

  const [course] = await db
    .select({ price: schema.courses.price })
    .from(schema.courses)
    .where(and(eq(schema.courses.id, body.courseId), eq(schema.courses.orgId, orgId)))
    .limit(1);

  if (!course) {
    return c.json({ error: "Course not found" }, 404);
  }

  const basePrice = Number(course.price || 0);
  let amount = basePrice;

  if (student.discountType === "percentage" && student.discountValue > 0) {
    amount = Math.round(basePrice * (1 - student.discountValue / 100));
  } else if (student.discountType === "fixed" && student.discountValue > 0) {
    amount = Math.max(0, basePrice - student.discountValue);
  }

  const status = body.status || "partial";

  const [record] = await db
    .insert(schema.monthlySubscriptions)
    .values({
      id: crypto.randomUUID(),
      orgId,
      studentId: body.studentId,
      courseId: body.courseId,
      startDate: body.startDate,
      endDate: body.endDate,
      amount,
      status,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ monthlySubscription: record }, 201);
});

app.get("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const result = await db
    .select()
    .from(schema.monthlySubscriptions)
    .where(and(eq(schema.monthlySubscriptions.id, id), eq(schema.monthlySubscriptions.orgId, orgId)));

  if (result.length === 0) {
    return c.json({ error: "Monthly subscription not found" }, 404);
  }

  return c.json({ monthlySubscription: result[0] });
});

app.patch("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    studentId: string;
    courseId: string;
    startDate: string;
    endDate: string;
    amount: number;
    status: string;
    paymentMethod: string;
    notes: string;
  }>>();

  const [updated] = await db
    .update(schema.monthlySubscriptions)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.monthlySubscriptions.id, id), eq(schema.monthlySubscriptions.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Monthly subscription not found" }, 404);
  }

  if (body.studentId || body.courseId) {
    if (!updated.studentId || !updated.courseId) {
      return c.json({ error: "studentId and courseId are required for discount calculation" }, 400);
    }
    const [student] = await db
      .select({
        discountType: schema.students.discountType,
        discountValue: schema.students.discountValue,
      })
      .from(schema.students)
      .where(and(eq(schema.students.id, updated.studentId), eq(schema.students.orgId, orgId)))
      .limit(1);

    const [course] = await db
      .select({ price: schema.courses.price })
      .from(schema.courses)
      .where(and(eq(schema.courses.id, updated.courseId), eq(schema.courses.orgId, orgId)))
      .limit(1);

    const basePrice = Number(course?.price || 0);
    let amount = basePrice;
    if (student?.discountType === "percentage" && student?.discountValue > 0) {
      amount = Math.round(basePrice * (1 - student.discountValue / 100));
    } else if (student?.discountType === "fixed" && student?.discountValue > 0) {
      amount = Math.max(0, basePrice - student.discountValue);
    }

    if (amount !== updated.amount) {
      const [recalculated] = await db
        .update(schema.monthlySubscriptions)
        .set({ amount, updatedAt: new Date().toISOString() })
        .where(eq(schema.monthlySubscriptions.id, id))
        .returning();
      return c.json({ monthlySubscription: recalculated });
    }
  }

  return c.json({ monthlySubscription: updated });
});

app.delete("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const [updated] = await db
    .update(schema.monthlySubscriptions)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.monthlySubscriptions.id, id), eq(schema.monthlySubscriptions.orgId, orgId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Monthly subscription not found" }, 404);
  }

  return c.json({ success: true });
});

export default app;
