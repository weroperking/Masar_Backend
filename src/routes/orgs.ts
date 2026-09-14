import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { createRequireActiveSubscription } from "../middleware/subscription";

const app = new Hono<{ Bindings: CloudflareBindings }>();
const requireActiveSubscription = createRequireActiveSubscription();

app.use("/*", requireActiveSubscription);

app.post("/:id/upgrade-proposal", async (c) => {
  const orgId = c.get("orgId") as string;
  const pathOrgId = c.req.param("id");
  if (orgId !== pathOrgId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json<{ requested_plan?: string }>();
  const requestedPlan = body.requested_plan;

  const validPlans = ["trial", "starter", "growth", "pro"];
  if (!requestedPlan || !validPlans.includes(requestedPlan)) {
    return c.json({ error: "Invalid plan. Valid: trial, starter, growth, pro" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL as string);

  const existing = await db
    .select()
    .from(schema.orgUpgradeProposals)
    .where(
      and(
        eq(schema.orgUpgradeProposals.orgId, orgId),
        eq(schema.orgUpgradeProposals.status, "pending"),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return c.json(
      { error: "Pending proposal already exists", proposal: existing[0] },
      409,
    );
  }

  const currentPlanResult = await db
    .select({ plan: schema.subscriptions.plan })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, orgId))
    .limit(1);

  const currentPlan = currentPlanResult[0]?.plan || "trial";

  const now = new Date().toISOString();
  const [proposal] = await db
    .insert(schema.orgUpgradeProposals)
    .values({
      id: globalThis.crypto.randomUUID(),
      orgId,
      requestedPlan,
      currentPlan,
      status: "pending",
      createdAt: now,
    })
    .returning();

  return c.json({ proposal }, 201);
});

app.get("/:id/upgrade-proposal/status", async (c) => {
  const orgId = c.get("orgId") as string;
  const pathOrgId = c.req.param("id");
  if (orgId !== pathOrgId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const db = createDb(c.env.DATABASE_URL as string);

  const proposals = await db
    .select()
    .from(schema.orgUpgradeProposals)
    .where(
      and(
        eq(schema.orgUpgradeProposals.orgId, orgId),
        isNull(schema.orgUpgradeProposals.resolvedAt),
      ),
    )
    .orderBy(desc(schema.orgUpgradeProposals.createdAt))
    .limit(1);

  const proposal = proposals.length > 0 ? proposals[0] : null;

  return c.json({ proposal });
});

export default app;
