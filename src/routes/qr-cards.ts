import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, isNull } from "drizzle-orm";
import { normalizeKeys } from "../lib/crud";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

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
    `QR-${crypto.randomUUID().slice(0, 8)}`;

  const record = {
    ...normalized,
    id: crypto.randomUUID(),
    orgId,
    cardNumber,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...(normalized.studentId !== undefined && { studentId: normalized.studentId }),
    ...(normalized.printStatus !== undefined && { printStatus: normalized.printStatus }),
    ...(normalized.linkedAt !== undefined && { linkedAt: normalized.linkedAt }),
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

  const sanitized: Record<string, any> = {};
  if (normalized.cardNumber !== undefined) sanitized.cardNumber = normalized.cardNumber;
  if (normalized.studentId !== undefined) sanitized.studentId = normalized.studentId;
  if (normalized.printStatus !== undefined) sanitized.printStatus = normalized.printStatus;
  if (normalized.linkedAt !== undefined) sanitized.linkedAt = normalized.linkedAt;

  const result = await db
    .update(schema.qrCards)
    .set({ ...sanitized, updatedAt: new Date().toISOString() })
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
