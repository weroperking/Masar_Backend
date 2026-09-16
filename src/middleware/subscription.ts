import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import { getSubscription, isSubscriptionActive, type EffectiveSubscription } from "../lib/subscriptions";
import { PLAN_LIMITS } from "../config/plans";
import type { PlanKey, FeatureKey } from "../config/plans";

export function createRequireActiveSubscription(): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const orgId = c.get("orgId") as string;
		const kv = c.env.SUBSCRIPTIONS_KV as KVNamespace;
		const databaseUrl = c.env.DATABASE_URL as string;

		const subscription = await getSubscription(orgId, kv, databaseUrl);

		if (!subscription || !isSubscriptionActive(subscription)) {
			if (!subscription) {
				return c.json(
					{
						error: "NO_SUBSCRIPTION",
						plan: "none",
						status: "none",
					},
					402,
				);
			}

			if (subscription.isEffectivelyExpired && subscription.status === "trialing") {
				return c.json(
					{
						error: "TRIAL_EXPIRED",
						plan: subscription.plan,
						trial_ended_at: subscription.trialEndsAt,
					},
					402,
				);
			}

			return c.json(
				{
					error: "SUBSCRIPTION_INACTIVE",
					plan: subscription.plan,
					status: subscription.status,
				},
				402,
			);
		}

		c.set("subscription", subscription);
		await next();
	};
}

export function createRequireFeature(featureKey: FeatureKey): MiddlewareHandler<AppEnv> {
	return async (c, next) => {
		const subscription = c.get("subscription") as EffectiveSubscription | undefined;

		if (!subscription) {
			return c.json(
				{
					error: "SUBSCRIPTION_INACTIVE",
				},
				402,
			);
		}

		const planKey = subscription.plan as PlanKey;
		const planConfig = PLAN_LIMITS[planKey];

		if (!planConfig) {
			return c.json(
				{
					error: "FEATURE_NOT_IN_PLAN",
					feature: featureKey,
					plan: subscription.plan,
				},
				403,
			);
		}

		const featureValue = planConfig[featureKey];
		if (featureValue === false) {
			return c.json(
				{
					error: "FEATURE_NOT_IN_PLAN",
					feature: featureKey,
					plan: subscription.plan,
				},
				403,
			);
		}

		await next();
	};
}
