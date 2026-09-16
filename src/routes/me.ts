import { Hono } from "hono";
import { getSubscription } from "../lib/subscriptions";
import { PLAN_LIMITS } from "../config/plans";
import type { PlanKey } from "../config/plans";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.get("/", (c) => {
  const userId = c.get("userId");
  const orgId = c.get("orgId");
  return c.json({ userId, orgId });
});

app.get("/subscription-status", async (c) => {
  const orgId = c.get("orgId") as string;
  const kv = c.env.SUBSCRIPTIONS_KV as KVNamespace;
  const databaseUrl = c.env.DATABASE_URL as string;

  const subscription = await getSubscription(orgId, kv, databaseUrl);

  if (!subscription) {
    return c.json(
      {
        plan: null,
        status: "none",
        trial_ends_at: null,
        days_remaining: 0,
        limits: PLAN_LIMITS.trial,
      },
      200,
    );
  }

  const now = new Date();
  const trialEndsAt = subscription.trialEndsAt;
  let daysRemaining = 0;
  if (trialEndsAt) {
    daysRemaining = Math.max(
      0,
      Math.floor((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  const planKey = subscription.plan as PlanKey;
  const limits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.trial;

  const effectiveStatus =
    subscription.isEffectivelyExpired && subscription.status === "trialing"
      ? "expired"
      : subscription.status;

  return c.json(
    {
      plan: subscription.plan,
      status: effectiveStatus,
      trial_ends_at: trialEndsAt,
      days_remaining: daysRemaining,
      limits,
    },
    200,
  );
});

export default app;
