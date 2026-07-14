import "server-only";
import type { BillingCycle } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { D } from "@/lib/money";
import { logPlatformAction } from "./audit";

export async function listPlans() {
  await requirePlatformAdmin();
  const plans = await db.plan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
  });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price.toFixed(2),
    billingCycle: p.billingCycle,
    maxUsers: p.maxUsers,
    maxProducts: p.maxProducts,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    subscriberCount: p._count.subscriptions,
  }));
}

export type PlanRow = Awaited<ReturnType<typeof listPlans>>[number];

export interface PlanInput {
  name: string;
  price: string;
  billingCycle: BillingCycle;
  maxUsers?: number | null;
  maxProducts?: number | null;
  sortOrder?: number;
}

export async function createPlan(input: PlanInput) {
  const { user } = await requirePlatformAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("NAME_REQUIRED");
  if (D(input.price).lt(0)) throw new Error("INVALID_PRICE");

  return db.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        name,
        price: D(input.price).toFixed(2),
        billingCycle: input.billingCycle,
        maxUsers: input.maxUsers ?? null,
        maxProducts: input.maxProducts ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "PLAN_CREATED",
      targetType: "Plan",
      targetId: plan.id,
      metadata: { name, price: input.price, cycle: input.billingCycle },
    });
    return plan;
  });
}

export async function updatePlan(planId: string, input: PlanInput & { isActive?: boolean }) {
  const { user } = await requirePlatformAdmin();
  const existing = await db.plan.findUnique({ where: { id: planId } });
  if (!existing) throw new Error("PLAN_NOT_FOUND");

  return db.$transaction(async (tx) => {
    const plan = await tx.plan.update({
      where: { id: planId },
      data: {
        name: input.name.trim(),
        price: D(input.price).toFixed(2),
        billingCycle: input.billingCycle,
        maxUsers: input.maxUsers ?? null,
        maxProducts: input.maxProducts ?? null,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "PLAN_UPDATED",
      targetType: "Plan",
      targetId: planId,
      metadata: { name: plan.name, isActive: plan.isActive },
    });
    return plan;
  });
}
