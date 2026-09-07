import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

type NewRecord = Record<string, any>;

export function createCrudRouter(
  plural: string,
  singular: string,
  table: PgTable<any>
) {
  const app = new Hono();

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
    const db = createDb(c.env.DATABASE_URL as string);
    const orgId = c.get("orgId") as string;
    const body = await c.req.json<NewRecord>();
    const record = {
      ...body,
      id: body.id || globalThis.crypto.randomUUID(),
      orgId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const result = await db.insert(table).values(record).returning();
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
    const result = await db
      .update(table)
      .set({ ...body, updatedAt: new Date().toISOString() })
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
