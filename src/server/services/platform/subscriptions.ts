import "server-only";
import type { BillingCycle, PlatformPaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { D } from "@/lib/money";
import { computeSubscriptionState } from "@/server/platform/subscription-state";
import { logPlatformAction } from "./audit";

const DAY_MS = 24 * 60 * 60 * 1000;

function cycleDays(cycle: BillingCycle): number {
  switch (cycle) {
    case "MONTHLY":
      return 30;
    case "QUARTERLY":
      return 90;
    case "YEARLY":
      return 365;
    case "LIFETIME":
      return 365 * 100;
  }
}

/** Cross-tenant subscriptions list, soonest expiry first. */
export async function listSubscriptions() {
  await requirePlatformAdmin();
  const subs = await db.subscription.findMany({
    include: {
      business: { select: { id: true, name: true, status: true } },
      plan: { select: { name: true, price: true, billingCycle: true } },
    },
  });

  return subs
    .map((s) => {
      const state = computeSubscriptionState(s);
      return {
        businessId: s.business.id,
        businessName: s.business.name,
        businessStatus: s.business.status,
        planName: s.plan.name,
        planPrice: s.plan.price.toFixed(2),
        billingCycle: s.plan.billingCycle,
        status: state.status,
        effectiveUntil: state.effectiveUntil?.toISOString() ?? null,
        daysLeft: state.daysLeft,
      };
    })
    .sort((a, b) => (a.effectiveUntil ?? "9999").localeCompare(b.effectiveUntil ?? "9999"));
}

/** Assign (or switch) a tenant's plan. Creates a trial when the tenant has no coverage yet. */
export async function assignSubscription(businessId: string, planId: string, trialDaysArg?: number) {
  const { user } = await requirePlatformAdmin();
  const [business, plan] = await Promise.all([
    db.business.findUnique({ where: { id: businessId } }),
    db.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!business) throw new Error("TENANT_NOT_FOUND");
  if (!plan || !plan.isActive) throw new Error("PLAN_NOT_FOUND");

  await db.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({ where: { businessId } });
    if (existing) {
      await tx.subscription.update({
        where: { businessId },
        data: { planId, cancelledAt: null },
      });
    } else {
      await tx.subscription.create({
        data: {
          businessId,
          planId,
          trialEndsAt: trialDaysArg ? new Date(Date.now() + trialDaysArg * DAY_MS) : null,
        },
      });
    }
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "SUBSCRIPTION_ASSIGNED",
      targetBusinessId: businessId,
      metadata: { plan: plan.name, trialDays: trialDaysArg ?? null },
    });
  });
}

export interface RecordPaymentInput {
  businessId: string;
  amount: string;
  method: PlatformPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  /** Billing cycles this payment buys (default 1). */
  cycles?: number;
}

/**
 * Record a manual payment and extend coverage in one transaction:
 * newPaidUntil = max(now, currentEffectiveUntil) + cycles × cycleLength.
 */
export async function recordPlatformPayment(input: RecordPaymentInput) {
  const { user } = await requirePlatformAdmin();
  const amount = D(input.amount);
  if (amount.lte(0)) throw new Error("INVALID_AMOUNT");
  const cycles = Math.min(24, Math.max(1, Math.trunc(input.cycles ?? 1)));

  const sub = await db.subscription.findUnique({
    where: { businessId: input.businessId },
    include: { plan: true },
  });
  if (!sub) throw new Error("NO_SUBSCRIPTION");

  const state = computeSubscriptionState(sub);
  const base = state.effectiveUntil && state.effectiveUntil > new Date() ? state.effectiveUntil : new Date();
  const periodEnd = new Date(base.getTime() + cycles * cycleDays(sub.plan.billingCycle) * DAY_MS);

  await db.$transaction(async (tx) => {
    await tx.platformPayment.create({
      data: {
        subscriptionId: sub.id,
        businessId: input.businessId,
        amount: amount.toFixed(2),
        method: input.method,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        periodStart: base,
        periodEnd,
        recordedById: user.id,
      },
    });
    await tx.subscription.update({
      where: { id: sub.id },
      data: { paidUntil: periodEnd, cancelledAt: null },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "PAYMENT_RECORDED",
      targetBusinessId: input.businessId,
      metadata: {
        amount: amount.toFixed(2),
        method: input.method,
        cycles,
        newPaidUntil: periodEnd.toISOString(),
      },
    });
  });

  return { paidUntil: periodEnd.toISOString() };
}

/** Extend coverage without a payment (goodwill / manual adjustment). Reason mandatory. */
export async function extendSubscription(businessId: string, days: number, reason: string) {
  const { user } = await requirePlatformAdmin();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("REASON_REQUIRED");
  const safeDays = Math.min(365, Math.max(1, Math.trunc(days)));

  const sub = await db.subscription.findUnique({ where: { businessId } });
  if (!sub) throw new Error("NO_SUBSCRIPTION");

  const state = computeSubscriptionState(sub);
  const base = state.effectiveUntil && state.effectiveUntil > new Date() ? state.effectiveUntil : new Date();
  const newPaidUntil = new Date(base.getTime() + safeDays * DAY_MS);

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: sub.id },
      data: { paidUntil: newPaidUntil, cancelledAt: null },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "SUBSCRIPTION_EXTENDED",
      targetBusinessId: businessId,
      metadata: { days: safeDays, reason: trimmed, newPaidUntil: newPaidUntil.toISOString() },
    });
  });

  return { paidUntil: newPaidUntil.toISOString() };
}
