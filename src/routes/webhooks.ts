import { Hono } from "hono";
import { createDb, schema } from "../db";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { generateLookupPrefix } from "../lib/lookup";

import type { AppEnv } from "../types";

function generateBookingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const app = new Hono<AppEnv>();

app.post("/clerk", async (c) => {
	const signingSecret = c.env.CLERK_WEBHOOK_SIGNING_SECRET as string;

	try {
		const evt = await verifyWebhook(c.req.raw, {
			signingSecret,
		});

		if (evt.type === "organization.created") {
			const orgId = evt.data.id as string;
			const name = (evt.data.name as string | undefined) || null;
			const now = new Date().toISOString();
			const trialStartedAt = now;
			const trialEndsAt = new Date(
				Date.now() + 14 * 24 * 60 * 60 * 1000,
			).toISOString();

			const cf = c.req.raw.cf as { country?: string; city?: string } | undefined;
			const country = cf?.country || null;
			const city = cf?.city || null;
			const bookingCode = generateBookingCode();
			const lookupPrefix = generateLookupPrefix();

			const db = createDb(c.env.DATABASE_URL as string);

			await db
				.insert(schema.subscriptions)
				.values({
					id: crypto.randomUUID(),
					orgId,
					name,
					plan: "trial",
					status: "trialing",
					trialStartedAt,
					trialEndsAt,
					country,
					city,
					bookingCode,
					lookupPrefix,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: schema.subscriptions.orgId,
					set: { name, updatedAt: now },
				});

			return c.json({ received: true, orgId, name, trialStartedAt, trialEndsAt, country, city, bookingCode }, 201);
		}

		return c.json({ received: true, eventType: evt.type }, 200);
	} catch (err: any) {
		console.error("Webhook verification failed:", err);
		return c.json({ error: "Webhook verification failed", detail: String(err.message) }, 400);
	}
});

export default app;
