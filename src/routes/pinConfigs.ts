import { Hono, type MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import { createDb, schema } from "../db";
import { eq, and, sql } from "drizzle-orm";

const app = new Hono<AppEnv>();

const VALID_PROFILE_TYPES = new Set(["admin", "assistant"]);

// In-memory rate limiter: userId -> { count, resetAt }
// Cold-start caveat: each Worker instance maintains its own independent counter.
// In a scaled deployment this means a user can send up to N*10 requests/min
// where N = number of active instances. Acceptable for MVP; migrate to KV/DO later.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

const rateLimitMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const result = checkRateLimit(userId);
  if (!result.allowed) {
    c.res.headers.set("Retry-After", "60");
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  c.res.headers.set("X-RateLimit-Remaining", String(result.remaining));
  await next();
};

app.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");

  const rows = await db
    .select()
    .from(schema.pinConfigs)
    .where(and(eq(schema.pinConfigs.orgId, orgId), sql`${schema.pinConfigs.deletedAt} IS NULL`));

  return c.json(rows);
});

app.put("/:profileType", rateLimitMiddleware, async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const profileType = c.req.param("profileType");

  if (!VALID_PROFILE_TYPES.has(profileType)) {
    return c.json({ error: "invalid_profile_type" }, 400);
  }

  const body = await c.req.json<{
    id: string;
    pinHash: string;
    pinSalt: string;
    pinIterations?: number;
    pinAlgorithm?: string;
    assistantPinRequired?: boolean;
    autoLockMinutes?: number;
    createdAt?: string;
    updatedAt: string;
  }>();

  if (!body.id || !body.pinHash || !body.pinSalt || !body.updatedAt) {
    return c.json({ error: "missing_fields", missing: ["id", "pinHash", "pinSalt", "updatedAt"].filter((f) => !(body as any)[f]) }, 400);
  }

  const allowedKeys = new Set([
    "id", "pinHash", "pinSalt", "pinIterations", "pinAlgorithm",
    "assistantPinRequired", "autoLockMinutes", "createdAt", "updatedAt",
  ]);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      return c.json({ error: `Unknown field: ${key}` }, 400);
    }
  }

  const now = new Date().toISOString();
  const insertData = {
    id: body.id,
    orgId: c.get("orgId"),
    profileType,
    pinHash: body.pinHash,
    pinSalt: body.pinSalt,
    pinIterations: body.pinIterations ?? 210000,
    pinAlgorithm: body.pinAlgorithm ?? "PBKDF2-SHA256",
    assistantPinRequired: body.assistantPinRequired ?? false,
    autoLockMinutes: body.autoLockMinutes ?? 15,
    createdAt: body.createdAt ?? now,
    updatedAt: body.updatedAt,
  } as const;

  await db
    .insert(schema.pinConfigs)
    .values(insertData as any)
    .onConflictDoUpdate({
      target: [schema.pinConfigs.orgId, schema.pinConfigs.profileType],
      set: {
        id: insertData.id,
        pinHash: insertData.pinHash,
        pinSalt: insertData.pinSalt,
        pinIterations: insertData.pinIterations,
        pinAlgorithm: insertData.pinAlgorithm,
        assistantPinRequired: insertData.assistantPinRequired,
        autoLockMinutes: insertData.autoLockMinutes,
        createdAt: insertData.createdAt,
        updatedAt: insertData.updatedAt,
        deletedAt: null,
      },
      where: eq(schema.pinConfigs.orgId, c.get("orgId")),
    });

  return c.json({ ok: true });
});

app.delete("/:profileType", rateLimitMiddleware, async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId");
  const profileType = c.req.param("profileType");

  if (!VALID_PROFILE_TYPES.has(profileType)) {
    return c.json({ error: "invalid_profile_type" }, 400);
  }

  const now = new Date().toISOString();
  await db
    .update(schema.pinConfigs)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(schema.pinConfigs.orgId, orgId), eq(schema.pinConfigs.profileType, profileType)));

  return c.json({ ok: true });
});

export default app;
