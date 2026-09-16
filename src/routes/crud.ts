import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import type { AppEnv } from "../types";

type TableName = {
  [K in keyof typeof schema]: (typeof schema)[K] extends {
    id: unknown;
    orgId: unknown;
    deletedAt: unknown;
  } ? K : never;
}[keyof typeof schema];

export function createCrudRoutes(tableName: TableName): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const table = schema[tableName];

  app.get("/", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId");

    const result = await db
      .select()
      .from(table)
      .where(and(eq(table.orgId, orgId), isNull(table.deletedAt)));

    return c.json(result);
  });

  app.post("/", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId");
    const body = await c.req.json();

    const { updated_at, created_at, sync_status, ...entityData } = body;

    const record = {
      ...entityData,
      id: crypto.randomUUID(),
      orgId,
      updatedAt: updated_at ?? new Date().toISOString(),
      deletedAt: null,
    };

    const result = await db.insert(table).values(record).returning();

    return c.json(result[0], 201);
  });

  app.get("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId");
    const id = c.req.param("id");

    const result = await db
      .select()
      .from(table)
      .where(and(eq(table.id, id), eq(table.orgId, orgId)));

    if (result.length === 0) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json(result[0]);
  });

  app.patch("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { updated_at, created_at, sync_status, ...updateData } = body;

    const result = await db
      .update(table)
      .set({ ...updateData, updatedAt: updated_at ?? new Date().toISOString() })
      .where(and(eq(table.id, id), eq(table.orgId, orgId)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json(result[0]);
  });

  app.delete("/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId");
    const id = c.req.param("id");

    const result = await db
      .update(table)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(table.id, id), eq(table.orgId, orgId)))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ success: true });
  });

  return app;
}
