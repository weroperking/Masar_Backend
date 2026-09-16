import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import { normalizeKeys } from "../lib/crud";

const app = new Hono();

app.get("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const result = await db
    .select()
    .from(schema.qrCards)
    .where(and(eq(schema.qrCards.orgId, orgId), isNull(schema.qrCards.deletedAt)));
  return c.json({ qrCards: result });
});

app.post("/", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const body = await c.req.json();
  const normalized = normalizeKeys(body);

  const cardNumber =
    normalized.cardNumber ||
    normalized.card_number ||
    `QR-${globalThis.crypto.randomUUID().slice(0, 8)}`;

  const record = {
    ...normalized,
    id: globalThis.crypto.randomUUID(),
    orgId,
    cardNumber,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const result = await db.insert(schema.qrCards).values(record).returning();
  return c.json({ qrCard: result[0] }, 201);
});

app.get("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const result = await db
    .select()
    .from(schema.qrCards)
    .where(and(eq(schema.qrCards.id, id), eq(schema.qrCards.orgId, orgId)));

  if (result.length === 0) return c.json({ error: "QrCard not found" }, 404);
  return c.json({ qrCard: result[0] });
});

app.patch("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const body = await c.req.json();
  const normalized = normalizeKeys(body);

  const result = await db
    .update(schema.qrCards)
    .set({ ...normalized, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.qrCards.id, id), eq(schema.qrCards.orgId, orgId)))
    .returning();

  if (result.length === 0) return c.json({ error: "QrCard not found" }, 404);
  return c.json({ qrCard: result[0] });
});

app.delete("/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");

  const result = await db
    .update(schema.qrCards)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(schema.qrCards.id, id), eq(schema.qrCards.orgId, orgId)))
    .returning();

  if (result.length === 0) return c.json({ error: "QrCard not found" }, 404);
  return c.json({ success: true });
});

export default app;
