import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq } from "drizzle-orm";
import { invalidateSubscriptionCache } from "../lib/subscriptions";
import { generateLookupPrefix } from "../lib/lookup";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.post("/upgrade", async (c) => {
	const orgId = c.get("orgId") as string;
	const body = await c.req.json<{ plan?: string }>();
	const plan = body.plan;

	const validPlans = ["trial", "starter", "growth", "pro"];
	if (!plan || !validPlans.includes(plan)) {
		return c.json({ error: "Invalid plan. Valid: trial, starter, growth, pro" }, 400);
	}

	const db = createDb(c.env.DATABASE_URL as string);
	const now = new Date().toISOString();

		const result = await db
			.update(schema.subscriptions)
			.set({
				plan,
				status: "active",
				currentPeriodEnd: new Date(
					Date.now() + 30 * 24 * 60 * 60 * 1000,
				).toISOString(),
				updatedAt: now,
			})
			.where(eq(schema.subscriptions.orgId, orgId))
			.returning();

	if (result.length === 0) {
		await db
			.insert(schema.subscriptions)
			.values({
				id: crypto.randomUUID(),
				orgId,
				plan,
				status: "active",
				trialEndsAt: null,
				lookupPrefix: generateLookupPrefix(),
				currentPeriodEnd: new Date(
					Date.now() + 30 * 24 * 60 * 60 * 1000,
				).toISOString(),
				createdAt: now,
				updatedAt: now,
			});
	}

	await invalidateSubscriptionCache(orgId, c.env.SUBSCRIPTIONS_KV as KVNamespace);

	return c.json({ success: true, plan, status: "active" });
});

export default app;
