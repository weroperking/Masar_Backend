import { Hono } from "hono";
import type { AppEnv } from "../types";
import { createDb, schema } from "../db";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { PLAN_LIMITS } from "../config/plans";
import type { PlanKey, NumericLimitKey } from "../config/plans";
import type { EffectiveSubscription } from "./subscriptions";

type NewRecord = Record<string, any>;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function normalizeKeys(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    out[toCamelCase(key)] = obj[key];
  }
  return out;
}

export function createCrudRouter(
  plural: string,
  singular: string,
  table: PgTable<any>,
  options?: {
    numericLimit?: {
      limitKey: NumericLimitKey;
      countColumn: any;
    };
  }
) {
  const app = new Hono<AppEnv>();

  app.get("/", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId") as string;
    const result = await db
      .select()
      .from(table)
      .where(and(eq((table as any).orgId, orgId), isNull((table as any).deletedAt)));
    return c.json({ [plural]: result });
  });

  app.post("/", async (c) => {
    const t0 = Date.now();
    const db = createDb(c.env.DATABASE_URL as string);
    const t1 = Date.now();
    const orgId = c.get("orgId") as string;
    const body = await c.req.json<NewRecord>();

    if (options?.numericLimit) {
      const subscription = c.get("subscription") as EffectiveSubscription;
      if (subscription) {
        const planKey = subscription.plan as PlanKey;
        const limits = PLAN_LIMITS[planKey];
        const limitValue = limits?.[options.numericLimit.limitKey];

        if (limitValue !== null && limitValue !== undefined) {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(table)
            .where(
              and(
                eq((table as any).orgId, orgId),
                isNull((table as any).deletedAt),
              ),
            );

          const currentCount = Number(countResult[0]?.count ?? 0);
          if (currentCount >= limitValue) {
            return c.json(
              {
                error: "LIMIT_REACHED",
                limit: limitValue,
                current: currentCount,
                plan: subscription.plan,
              },
              403,
            );
          }
        }
      }
    }

    const normalized = normalizeKeys(body);
    const record = {
      ...normalized,
      id: crypto.randomUUID(),
      orgId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const result = await db.insert(table).values(record).returning();
    const t2 = Date.now();
    console.log(`[perf] ${singular}_create db_connect=${t1-t0}ms insert=${t2-t1}ms route=${c.req.url}`);
    return c.json({ [singular]: result[0] }, 201);
  });

  app.get("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId") as string;
    const id = c.req.param("id");
    const result = await db
      .select()
      .from(table)
      .where(and(eq((table as any).id, id), eq((table as any).orgId, orgId)));
    if (result.length === 0) return c.json({ error: `${singular} not found` }, 404);
    return c.json({ [singular]: result[0] });
  });

  app.patch("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId") as string;
    const id = c.req.param("id");
    const body = await c.req.json<Partial<NewRecord>>();
    const normalized = normalizeKeys(body);
    const result = await db
      .update(table)
      .set({ ...normalized, updatedAt: new Date().toISOString() })
      .where(and(eq((table as any).id, id), eq((table as any).orgId, orgId)))
      .returning();
    if (result.length === 0) return c.json({ error: `${singular} not found` }, 404);
    return c.json({ [singular]: result[0] });
  });

  app.delete("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId") as string;
    const id = c.req.param("id");
    const result = await db
      .update(table)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq((table as any).id, id), eq((table as any).orgId, orgId)))
      .returning();
    if (result.length === 0) return c.json({ error: `${singular} not found` }, 404);
    return c.json({ success: true });
  });

  return app;
}
