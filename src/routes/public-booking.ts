import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq } from "drizzle-orm";
import { cors } from "hono/cors";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.use("/*", cors({ origin: ["https://masar.top", "https://app.masar.top"] }));

const ipRateLimitStore = new Map<string, number[]>();
const IP_RATE_LIMIT_MAX = 5;
const IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = ipRateLimitStore.get(ip) || [];
  const recent = hits.filter((t) => now - t < IP_RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  ipRateLimitStore.set(ip, recent);
  return recent.length <= IP_RATE_LIMIT_MAX;
}

interface DeviceBooking {
  date: string;
  count: number;
}

const deviceRateLimitStore = new Map<string, DeviceBooking>();
const DEVICE_RATE_LIMIT_MAX = 3;

function checkDeviceRateLimit(deviceId: string, orgId: string): boolean {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const key = `${deviceId}:${orgId}`;
  const record = deviceRateLimitStore.get(key);
  if (record && record.date === today) {
    if (record.count >= DEVICE_RATE_LIMIT_MAX) {
      return false;
    }
    record.count++;
    return true;
  }
  deviceRateLimitStore.set(key, { date: today, count: 1 });
  return true;
}

function cleanupDeviceStore() {
  const today = new Date().toISOString().slice(0, 10);
  for (const [key, record] of deviceRateLimitStore.entries()) {
    if (record.date !== today) {
      deviceRateLimitStore.delete(key);
    }
  }
}

app.get("/:code", async (c) => {
  const code = c.req.param("code");
  const db = createDb(c.env.DATABASE_URL as string);

  const [subscription] = await db
    .select({
      orgId: schema.subscriptions.orgId,
      name: schema.subscriptions.name,
      plan: schema.subscriptions.plan,
      status: schema.subscriptions.status,
      country: schema.subscriptions.country,
      city: schema.subscriptions.city,
    })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.bookingCode, code))
    .limit(1);

  if (!subscription) {
    return c.json({ error: "Organization not found" }, 404);
  }

  return c.json({
    org_id: subscription.orgId,
    name: subscription.name,
    plan: subscription.plan,
    status: subscription.status,
    country: subscription.country,
    city: subscription.city,
  });
});

app.post("/:code", async (c) => {
  cleanupDeviceStore();

  const code = c.req.param("code");
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";

  if (!checkIpRateLimit(ip)) {
    return c.json(
      { error: "Rate limit exceeded", detail: "Too many requests from this IP. Please try again later." },
      429,
    );
  }

  const db = createDb(c.env.DATABASE_URL as string);

  const [subscription] = await db
    .select({ orgId: schema.subscriptions.orgId })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.bookingCode, code))
    .limit(1);

  if (!subscription) {
    return c.json({ error: "Organization not found" }, 404);
  }

  const deviceId = c.req.header("X-Device-Id");
  if (deviceId) {
    if (!checkDeviceRateLimit(deviceId, subscription.orgId)) {
      return c.json(
        { error: "Rate limit exceeded", detail: "Too many bookings from this device. Please try again tomorrow." },
        429,
      );
    }
  }

  const body = await c.req.json<{
    name: string;
    phone: string;
    courseId: string;
    declaredAmount?: number;
    requestDate: string;
  }>();

  if (!body.name || !body.phone || !body.courseId || !body.requestDate) {
    return c.json({ error: "Missing required fields: name, phone, courseId, requestDate" }, 400);
  }

  const now = new Date().toISOString();

  const [booking] = await db
    .insert(schema.bookingRequests)
    .values({
      id: crypto.randomUUID(),
      orgId: subscription.orgId,
      name: body.name,
      phone: body.phone,
      courseId: body.courseId,
      declaredAmount: body.declaredAmount ?? 0,
      requestDate: body.requestDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json({ success: true, booking }, 201);
});

export default app;
