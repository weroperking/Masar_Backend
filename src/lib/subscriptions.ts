import { createDb, schema } from "../db";
import type { Subscription } from "../db/schema";
import { PLAN_LIMITS, type PlanKey } from "../config/plans";
import { eq } from "drizzle-orm";

export interface EffectiveSubscription extends Subscription {
	isEffectivelyExpired: boolean;
}

const KV_TTL_SECONDS = 60;

export async function getSubscription(
	orgId: string,
	kv: KVNamespace,
	databaseUrl: string,
): Promise<EffectiveSubscription | null> {
	const cacheKey = `sub:${orgId}`;
	const cached = await kv.get(cacheKey, { type: "json" });
	if (cached) {
		return computeEffectiveStatus(cached as Subscription);
	}

	const db = createDb(databaseUrl);
	let result = await db
		.select()
		.from(schema.subscriptions)
		.where(eq(schema.subscriptions.orgId, orgId))
		.limit(1);

	if (result.length === 0) {
		const now = new Date().toISOString();
		const trialStartedAt = now;
		const trialEndsAt = new Date(
			Date.now() + 14 * 24 * 60 * 60 * 1000,
		).toISOString();

		await db
			.insert(schema.subscriptions)
			.values({
				id: crypto.randomUUID(),
				orgId,
				plan: "trial",
				status: "trialing",
				trialStartedAt,
				trialEndsAt,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing({ target: schema.subscriptions.orgId });

		result = await db
			.select()
			.from(schema.subscriptions)
			.where(eq(schema.subscriptions.orgId, orgId))
			.limit(1);
	}

	const subscription = result[0];

	await kv.put(cacheKey, JSON.stringify(subscription), {
		expirationTtl: KV_TTL_SECONDS,
	});

	return computeEffectiveStatus(subscription);
}

export function computeEffectiveStatus(
	subscription: Subscription,
): EffectiveSubscription {
	const now = new Date();
	const isEffectivelyExpired =
		subscription.status === "trialing"
			? subscription.trialEndsAt !== null &&
				new Date(subscription.trialEndsAt) < now
			: subscription.status === "expired" ||
				subscription.status === "canceled" ||
				subscription.status === "past_due";

	return {
		...subscription,
		isEffectivelyExpired,
	};
}

export function isSubscriptionActive(
	subscription: EffectiveSubscription | null,
): boolean {
	if (!subscription) return false;
	return !subscription.isEffectivelyExpired;
}

export async function invalidateSubscriptionCache(
	orgId: string,
	kv: KVNamespace,
): Promise<void> {
	await kv.delete(`sub:${orgId}`);
}

export function getPlanLimits(plan: PlanKey) {
	return PLAN_LIMITS[plan];
}
