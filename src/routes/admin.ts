import { Hono } from "hono";
import { createDb, schema } from "../db";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
import { createAdminMiddleware } from "../middleware/admin";
import { PLAN_LIMITS, type PlanKey } from "../config/plans";
import { getPlanLimits } from "../lib/subscriptions";

import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

app.use("/*", createAdminMiddleware());

app.get("/orgs", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const statusFilter = c.req.query("status");
  const planFilter = c.req.query("plan");

  let proposalsQuery = db.select().from(schema.orgUpgradeProposals).$dynamic();
  if (statusFilter) {
    proposalsQuery = proposalsQuery.where(eq(schema.orgUpgradeProposals.status, statusFilter));
  }
  const allProposals = await proposalsQuery.orderBy(desc(schema.orgUpgradeProposals.createdAt));

  const latestByOrg = new Map<string, (typeof allProposals)[0]>();
  for (const p of allProposals) {
    if (!latestByOrg.has(p.orgId)) {
      latestByOrg.set(p.orgId, p);
    }
  }

  const subscriptions = await db.select().from(schema.subscriptions);

  const orgIds = subscriptions.map((s) => s.orgId);
  const studentCounts = orgIds.length > 0
    ? await db.select({
        orgId: schema.students.orgId,
        count: sql<number>`count(*)`.as("count"),
      }).from(schema.students)
        .where(and(
          inArray(schema.students.orgId, orgIds),
          isNull(schema.students.deletedAt),
        ))
        .groupBy(schema.students.orgId)
    : [];
  const branchCounts = orgIds.length > 0
    ? await db.select({
        orgId: schema.groups.orgId,
        count: sql<number>`count(*)`.as("count"),
      }).from(schema.groups)
        .where(and(
          inArray(schema.groups.orgId, orgIds),
          isNull(schema.groups.deletedAt),
        ))
        .groupBy(schema.groups.orgId)
    : [];

  const studentMap = new Map(studentCounts.map((r) => [r.orgId, Number(r.count)]));
  const branchMap = new Map(branchCounts.map((r) => [r.orgId, Number(r.count)]));

  const orgs = subscriptions.map((sub) => {
    const proposal = latestByOrg.get(sub.orgId);
    return {
      org_id: sub.orgId,
      name: sub.name,
      plan: sub.plan,
      status: sub.status,
      trial_ends_at: sub.trialEndsAt,
      current_period_end: sub.currentPeriodEnd,
      country: sub.country,
      city: sub.city,
      booking_code: sub.bookingCode,
      created_at: sub.createdAt,
      updated_at: sub.updatedAt,
      student_count: studentMap.get(sub.orgId) || 0,
      branch_count: branchMap.get(sub.orgId) || 0,
      latest_proposal: proposal || null,
    };
  });

  return c.json({ orgs });
});

app.get("/orgs/:id", async (c) => {
  const orgId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL as string);

  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.orgId, orgId))
    .limit(1);

  if (!subscription) {
    return c.json({ error: "Org not found" }, 404);
  }

  const [studentCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.students)
    .where(and(eq(schema.students.orgId, orgId), isNull(schema.students.deletedAt)));

  const [branchCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.groups)
    .where(and(eq(schema.groups.orgId, orgId), isNull(schema.groups.deletedAt)));

  const [proposal] = await db
    .select()
    .from(schema.orgUpgradeProposals)
    .where(and(
      eq(schema.orgUpgradeProposals.orgId, orgId),
      isNull(schema.orgUpgradeProposals.resolvedAt),
    ))
    .orderBy(desc(schema.orgUpgradeProposals.createdAt))
    .limit(1);

  return c.json({
    org: {
      ...subscription,
      name: subscription.name,
      booking_code: subscription.bookingCode,
      student_count: Number(studentCountRow?.count ?? 0),
      branch_count: Number(branchCountRow?.count ?? 0),
      latest_proposal: proposal || null,
    },
  });
});

app.patch("/orgs/:id/plan", async (c) => {
  const orgId = c.req.param("id");
  const body = await c.req.json<{ plan?: string }>();
  const plan = body.plan;

  const validPlans = ["trial", "starter", "growth", "pro"];
  if (!plan || !validPlans.includes(plan)) {
    return c.json({ error: "Invalid plan. Valid: trial, starter, growth, pro" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL as string);
  const now = new Date().toISOString();

  const [updated] = await db
    .update(schema.subscriptions)
    .set({
      plan,
      status: plan === "trial" ? "trialing" : "active",
      currentPeriodEnd: plan === "trial" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now,
    })
    .where(eq(schema.subscriptions.orgId, orgId))
    .returning();

  if (!updated) {
    return c.json({ error: "Org not found" }, 404);
  }

  return c.json({ subscription: updated });
});

app.get("/proposals", async (c) => {
  const db = createDb(c.env.DATABASE_URL as string);
  const status = c.req.query("status");

  let query = db.select().from(schema.orgUpgradeProposals).$dynamic();
  if (status) {
    query = query.where(eq(schema.orgUpgradeProposals.status, status));
  }

  const proposals = await query.orderBy(desc(schema.orgUpgradeProposals.createdAt));

  return c.json({ proposals });
});

app.patch("/proposals/:id", async (c) => {
  const proposalId = c.req.param("id");
  const body = await c.req.json<{
    status?: string;
    notes?: string;
    apply_plan?: boolean;
  }>();
  const newStatus = body.status;
  const notes = body.notes;
  const applyPlan = body.apply_plan === true;

  const validStatuses = ["pending", "contacted", "resolved", "rejected"];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return c.json(
      { error: "Invalid status. Valid: pending, contacted, resolved, rejected" },
      400,
    );
  }

  const db = createDb(c.env.DATABASE_URL as string);
  const now = new Date().toISOString();

  const [existing] = await db
    .select()
    .from(schema.orgUpgradeProposals)
    .where(eq(schema.orgUpgradeProposals.id, proposalId))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Proposal not found" }, 404);
  }

  const updateData: Record<string, any> = {
    status: newStatus,
    resolvedAt: newStatus === "resolved" || newStatus === "rejected" ? now : null,
    resolvedBy: "admin",
  };

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  const [updated] = await db
    .update(schema.orgUpgradeProposals)
    .set(updateData)
    .where(eq(schema.orgUpgradeProposals.id, proposalId))
    .returning();

  if (applyPlan && newStatus === "resolved") {
    const planUpdate = await db
      .update(schema.subscriptions)
      .set({
        plan: existing.requestedPlan,
        status: existing.requestedPlan === "trial" ? "trialing" : "active",
        currentPeriodEnd:
          existing.requestedPlan === "trial"
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now,
      })
      .where(eq(schema.subscriptions.orgId, existing.orgId))
      .returning();

    return c.json({ proposal: updated, subscription: planUpdate[0] });
  }

  return c.json({ proposal: updated });
});

export default app;
