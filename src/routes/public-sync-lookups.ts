import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { createDb, schema } from "../db";
import { decodeLookupCode } from "../lib/lookup";
import { createOptionalAuthMiddleware } from "../middleware/optional-auth";
import type { AppEnv } from "../types";

/**
 * POST /api/public/sync-lookups
 *
 * The frontend posts the rendered public student card (student + attendance +
 * exams + subscription) for one or more students. Each entry is upserted into
 * public_sync_lookups keyed by (org_id, student_id).
 *
 * Request — one of:
 *   { <lookup>, ... }                        (single object)
 *   [ { <lookup>, ... } ]                    (array)
 *   { "lookups": [ { <lookup> } ] }          (envelope)
 *
 * <lookup>:
 *   studentId    string  — required unless lookupCode is given
 *   lookupCode   string? — org+student-scoped capability code ("/p/s/<code>")
 *   orgId        string? — required when unauthenticated and no lookupCode
 *   student      object? — student snapshot as rendered (stored as-is)
 *   teacherName / academyName / centerName / branch   string?
 *   attendance   object? — { attended, missed, total, rate, sessions[] }
 *   exams        array?  — exam rows as rendered
 *   subscription object? — { status, month, year, amountTotal, amountPaid }
 *
 * Response 200:
 *   { "ok": true, "count": n, "lookups": [ { id, orgId, studentId, lookupCode, updatedAt } ] }
 * Response 400:
 *   { "error": "invalid_request", "errors": [ { index, studentId, reason } ] }  (all-or-nothing, nothing written)
 *
 * GET /api/public/sync-lookups?studentId=&limit= — read back stored cards.
 */
const app = new Hono<AppEnv>();

const ALLOWED_ORIGINS = [
  "https://app.masar.top",
  "https://masar.top",
  "https://www.masar.top",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return null;
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      // Any other masar.top subdomain (staging/preview deploys) is allowed.
      if (/^https:\/\/([a-z0-9-]+\.)*masar\.top$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.use("*", createOptionalAuthMiddleware());

/** In-memory per-IP limiter; same caveat as routes/public-lookup.ts (per-isolate). */
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimitStore.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  rateLimitStore.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
}

const MAX_BATCH = 100;
const MAX_STRING = 255;

function asObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function optString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_STRING);
}

type EntryError = { index: number; studentId: string | null; reason: string };

type NormalizedEntry = {
  index: number;
  studentId: string;
  lookupCode: string | null;
  claimedOrgId: string | null;
  student: Record<string, any> | null;
  teacherName: string | null;
  academyName: string | null;
  centerName: string | null;
  branch: string | null;
  attendance: Record<string, any> | null;
  exams: unknown[] | null;
  subscription: Record<string, any> | null;
};

function normalize(rawBody: unknown): { entries: NormalizedEntry[]; errors: EntryError[] } {
  let list: unknown[];

  if (Array.isArray(rawBody)) {
    list = rawBody;
  } else {
    const obj = asObject(rawBody);
    if (!obj) {
      return { entries: [], errors: [{ index: -1, studentId: null, reason: "body_must_be_object_or_array" }] };
    }
    if (Array.isArray(obj.lookups)) {
      list = obj.lookups;
    } else if (Array.isArray(obj.items)) {
      list = obj.items;
    } else {
      list = [obj];
    }
  }

  if (list.length === 0) {
    return { entries: [], errors: [{ index: -1, studentId: null, reason: "empty_payload" }] };
  }
  if (list.length > MAX_BATCH) {
    return { entries: [], errors: [{ index: -1, studentId: null, reason: `too_many_lookups_max_${MAX_BATCH}` }] };
  }

  const entries: NormalizedEntry[] = [];
  const errors: EntryError[] = [];

  list.forEach((item, index) => {
    const obj = asObject(item);
    if (!obj) {
      errors.push({ index, studentId: null, reason: "entry_must_be_object" });
      return;
    }

    const studentObj = asObject(obj.student);
    const studentId =
      optString(obj.studentId) ??
      optString(obj.student_id) ??
      optString(studentObj?.id) ??
      null;
    const lookupCode = optString(obj.lookupCode) ?? optString(obj.lookup_code) ?? null;
    const claimedOrgId = optString(obj.orgId) ?? optString(obj.org_id) ?? null;

    if (!studentId && !lookupCode) {
      errors.push({ index, studentId: null, reason: "missing_studentId" });
      return;
    }

    const attendance = asObject(obj.attendance);
    const subscription = asObject(obj.subscription);
    const exams = Array.isArray(obj.exams) ? obj.exams : null;

    entries.push({
      index,
      // placeholder; resolved from lookupCode / DB below when absent
      studentId: studentId ?? "",
      lookupCode,
      claimedOrgId,
      student: studentObj,
      teacherName: optString(obj.teacherName) ?? optString(obj.teacher_name),
      academyName: optString(obj.academyName) ?? optString(obj.academy_name),
      centerName: optString(obj.centerName) ?? optString(obj.center_name),
      branch: optString(obj.branch),
      attendance,
      exams,
      subscription,
    });
  });

  return { entries, errors };
}

app.post("/sync-lookups", async (c) => {
  if (rateLimited(clientIp(c))) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const { entries, errors } = normalize(rawBody);
  if (errors.length > 0) {
    return c.json({ error: "invalid_request", errors }, 400);
  }

  const db = createDb(c.env.DATABASE_URL as string);
  const authOrgId = c.get("orgId");
  const now = new Date().toISOString();

  // Resolve org + student for every entry before writing anything, so the
  // endpoint is all-or-nothing.
  const resolved: Array<{
    entry: NormalizedEntry;
    orgId: string;
    studentId: string;
    lookupCode: string | null;
  }> = [];

  for (const entry of entries) {
    let orgId: string | null = null;
    let studentId = entry.studentId || null;
    let lookupCode = entry.lookupCode;

    if (entry.lookupCode) {
      const decoded = decodeLookupCode(entry.lookupCode);
      if (!decoded) {
        errors.push({ index: entry.index, studentId, reason: "invalid_lookup_code" });
        continue;
      }
      const [sub] = await db
        .select({ orgId: schema.subscriptions.orgId })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.lookupPrefix, decoded.orgPrefix))
        .limit(1);
      if (!sub) {
        errors.push({ index: entry.index, studentId, reason: "unknown_lookup_code" });
        continue;
      }
      orgId = sub.orgId;
      if (studentId && studentId !== decoded.studentId) {
        errors.push({ index: entry.index, studentId, reason: "studentId_lookup_code_mismatch" });
        continue;
      }
      studentId = decoded.studentId;
    }

    if (authOrgId) {
      if (entry.claimedOrgId && entry.claimedOrgId !== authOrgId) {
        errors.push({ index: entry.index, studentId, reason: "org_scope_mismatch" });
        continue;
      }
      orgId = orgId ?? authOrgId;
    }

    if (!orgId) {
      orgId = entry.claimedOrgId;
    }

    if (!orgId) {
      errors.push({ index: entry.index, studentId, reason: "org_required_unauthenticated" });
      continue;
    }
    if (!studentId) {
      errors.push({ index: entry.index, studentId: null, reason: "missing_studentId" });
      continue;
    }

    resolved.push({ entry, orgId, studentId, lookupCode });
  }

  if (errors.length > 0) {
    return c.json({ error: "invalid_request", errors }, 400);
  }

  // Confirm the student really belongs to the org being written to.
  const studentIds = Array.from(new Set(resolved.map((r) => r.studentId)));
  const studentRows = await db
    .select({
      id: schema.students.id,
      orgId: schema.students.orgId,
      lookupCode: schema.students.lookupCode,
    })
    .from(schema.students)
    .where(
      and(
        inArray(schema.students.id, studentIds),
        isNull(schema.students.deletedAt)
      )
    );
  const studentById = new Map(studentRows.map((r) => [r.id, r]));

  const persisted: any[] = [];

  for (const item of resolved) {
    const student = studentById.get(item.studentId);
    if (!student) {
      errors.push({ index: item.entry.index, studentId: item.studentId, reason: "student_not_found" });
      continue;
    }
    if (student.orgId !== item.orgId) {
      errors.push({ index: item.entry.index, studentId: item.studentId, reason: "student_org_mismatch" });
      continue;
    }

    const lookupCode = student.lookupCode ?? item.lookupCode ?? null;
    // Deterministic PK: re-posting the same student updates in place.
    const rowId = `${item.orgId}:${item.studentId}`;

    const values = {
      id: rowId,
      orgId: item.orgId,
      studentId: item.studentId,
      lookupCode,
      student: item.entry.student,
      teacherName: item.entry.teacherName,
      academyName: item.entry.academyName,
      centerName: item.entry.centerName,
      branch: item.entry.branch,
      attendance: item.entry.attendance,
      exams: item.entry.exams,
      subscription: item.entry.subscription,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const [row] = await db
      .insert(schema.publicSyncLookups)
      .values(values)
      .onConflictDoUpdate({
        target: [schema.publicSyncLookups.orgId, schema.publicSyncLookups.studentId],
        set: {
          lookupCode: values.lookupCode,
          student: values.student,
          teacherName: values.teacherName,
          academyName: values.academyName,
          centerName: values.centerName,
          branch: values.branch,
          attendance: values.attendance,
          exams: values.exams,
          subscription: values.subscription,
          updatedAt: values.updatedAt,
          deletedAt: null,
        },
      })
      .returning();

    persisted.push({
      id: row?.id ?? rowId,
      orgId: item.orgId,
      studentId: item.studentId,
      lookupCode,
      updatedAt: row?.updatedAt ?? now,
    });
  }

  if (errors.length > 0) {
    return c.json({ error: "invalid_request", errors }, 400);
  }

  return c.json({ ok: true, count: persisted.length, lookups: persisted });
});

app.get("/sync-lookups", async (c) => {
  if (rateLimited(clientIp(c))) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const db = createDb(c.env.DATABASE_URL as string);
  const authOrgId = c.get("orgId");
  const studentId = c.req.query("studentId") ?? c.req.query("student_id");
  const lookupCode = c.req.query("lookupCode") ?? c.req.query("lookup_code");
  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 200);

  const conditions = [sql`${schema.publicSyncLookups.deletedAt} IS NULL`];

  if (studentId) {
    conditions.push(eq(schema.publicSyncLookups.studentId, studentId));
  }
  if (lookupCode) {
    conditions.push(eq(schema.publicSyncLookups.lookupCode, lookupCode));
  }
  if (authOrgId) {
    conditions.push(eq(schema.publicSyncLookups.orgId, authOrgId));
  } else if (!studentId && !lookupCode) {
    // Unauthenticated and unscoped: refuse to dump the whole table.
    return c.json(
      { error: "scope_required", hint: "authenticate, or pass studentId / lookupCode" },
      400
    );
  }

  const rows = await db
    .select()
    .from(schema.publicSyncLookups)
    .where(and(...conditions))
    .limit(limit);

  return c.json({ ok: true, count: rows.length, lookups: rows });
});

export default app;
