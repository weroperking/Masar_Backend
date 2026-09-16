import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { cors } from "hono/cors";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.use("/*", cors({ origin: ["https://masar.top", "https://app.masar.top"] }));

const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = rateLimitStore.get(ip) || [];
  const recent = hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitStore.set(ip, recent);
  return recent.length <= RATE_LIMIT_MAX;
}

app.get("/lookup/:token", async (c) => {
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
  if (!rateLimit(ip)) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const token = c.req.param("token");
  const db = createDb(c.env.DATABASE_URL as string);

  const studentRows = await db
    .select()
    .from(schema.students)
    .where(and(eq(schema.students.publicLookupToken, token), isNull(schema.students.deletedAt)));

  if (studentRows.length === 0) {
    return c.json({ error: "Student not found" }, 404);
  }

  const student = studentRows[0];
  const studentId = student.id;
  const orgId = student.orgId;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const startOfMonth = `${monthPrefix}-01`;
  const endOfMonth = `${monthPrefix}-31`;

  const [attendanceResult, examsResult, subscriptionResult] = await Promise.all([
    db
      .select({
        attended: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'present')`.as("attended"),
        missed: sql<number>`count(*) filter (where ${schema.attendanceRecords.status} = 'absent')`.as("missed"),
      })
      .from(schema.attendanceRecords)
      .innerJoin(
        schema.attendanceSessions,
        sql`${schema.attendanceRecords.sessionId} = cast(${schema.attendanceSessions.id} as text)`
      )
      .innerJoin(
        schema.enrollments,
        sql`${schema.enrollments.studentId} = ${studentId} AND ${schema.enrollments.groupId} = ${schema.attendanceSessions.groupId} AND ${schema.enrollments.orgId} = ${orgId}`
      )
      .where(
        and(
          sql`${schema.attendanceRecords.studentId} = ${studentId}`,
          eq(schema.attendanceSessions.orgId, orgId),
          isNull(schema.attendanceRecords.deletedAt),
          isNull(schema.attendanceSessions.deletedAt),
          isNull(schema.enrollments.deletedAt),
        )
      ),
    db
      .select({
        name: schema.assessments.name,
        grade: schema.assessmentGrades.grade,
      })
      .from(schema.assessmentGrades)
      .innerJoin(
        schema.assessments,
        sql`${schema.assessmentGrades.assessmentId} = cast(${schema.assessments.id} as text)`
      )
      .where(
        and(
          sql`${schema.assessmentGrades.studentId} = ${studentId}`,
          eq(schema.assessments.orgId, orgId),
          isNull(schema.assessmentGrades.deletedAt),
          isNull(schema.assessments.deletedAt),
        )
      ),
    db.execute<{ status: string }>(
      sql`SELECT status FROM monthly_subscriptions WHERE student_id = ${studentId} AND org_id = ${orgId} AND start_date <= ${endOfMonth} AND end_date >= ${startOfMonth} AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`
      ),
  ]);

  const subscriptionStatus = subscriptionResult.rows.length > 0
    ? subscriptionResult.rows[0].status
    : "no_record";

  return c.json({
    name: student.name,
    attendance: {
      attended: Number(attendanceResult[0]?.attended || 0),
      missed: Number(attendanceResult[0]?.missed || 0),
    },
    exams: examsResult.map((e) => ({ name: e.name, grade: e.grade })),
    subscription: {
      status: subscriptionStatus,
      month: `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
    },
  });
});

export default app;
