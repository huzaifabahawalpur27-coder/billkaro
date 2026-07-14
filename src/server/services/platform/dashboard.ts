import "server-only";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { D } from "@/lib/money";
import { computeSubscriptionState } from "@/server/platform/subscription-state";

export async function getPlatformDashboard() {
  await requirePlatformAdmin();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalTenants,
    suspendedTenants,
    totalUsers,
    subs,
    monthPayments,
    recentSignups,
    gmvAggregate,
    topSales,
  ] = await Promise.all([
    db.business.count(),
    db.business.count({ where: { status: "SUSPENDED" } }),
    db.user.count({ where: { isPlatformAdmin: false } }),
    db.subscription.findMany({
      include: {
        business: { select: { id: true, name: true, status: true } },
        plan: { select: { name: true, price: true } },
      },
    }),
    db.platformPayment.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    db.business.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    db.sale.aggregate({
      where: { status: "COMPLETED" },
      _sum: { grandTotal: true },
    }),
    db.sale.groupBy({
      by: ["businessId"],
      where: { status: "COMPLETED", createdAt: { gte: last30d } },
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 5,
    }),
  ]);

  // Signups bucketed into the last 6 calendar months, zero-filled.
  const signupsByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    signupsByMonth.push({
      month: d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
      count: recentSignups.filter(
        (b) =>
          b.createdAt.getFullYear() === d.getFullYear() &&
          b.createdAt.getMonth() === d.getMonth()
      ).length,
    });
  }

  // groupBy can't join — resolve tenant names in one lookup.
  const topBusinesses = await db.business.findMany({
    where: { id: { in: topSales.map((t) => t.businessId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topBusinesses.map((b) => [b.id, b.name]));
  const topTenants = topSales.map((t) => ({
    businessId: t.businessId,
    name: nameById.get(t.businessId) ?? "(deleted)",
    total: D(t._sum.grandTotal ?? 0).toFixed(2),
  }));

  let active = 0;
  let trial = 0;
  let grace = 0;
  let expired = 0;
  const renewals: {
    businessId: string;
    businessName: string;
    planName: string;
    status: string;
    effectiveUntil: string;
    daysLeft: number;
  }[] = [];

  for (const s of subs) {
    const state = computeSubscriptionState(s, now);
    if (state.status === "ACTIVE") active++;
    else if (state.status === "TRIAL") trial++;
    else if (state.status === "GRACE") grace++;
    else if (state.status === "EXPIRED") expired++;

    // Renewals due within 7 days (or already in grace).
    if (
      state.effectiveUntil &&
      (state.status === "GRACE" ||
        ((state.status === "ACTIVE" || state.status === "TRIAL") && (state.daysLeft ?? 99) <= 7))
    ) {
      renewals.push({
        businessId: s.business.id,
        businessName: s.business.name,
        planName: s.plan.name,
        status: state.status,
        effectiveUntil: state.effectiveUntil.toISOString(),
        daysLeft: state.daysLeft ?? 0,
      });
    }
  }
  renewals.sort((a, b) => a.effectiveUntil.localeCompare(b.effectiveUntil));

  return {
    totalTenants,
    suspendedTenants,
    totalUsers,
    activeSubs: active,
    trialSubs: trial,
    graceSubs: grace,
    expiredSubs: expired,
    unsubscribed: totalTenants - subs.length,
    monthRevenue: D(monthPayments._sum.amount ?? 0).toFixed(2),
    monthPaymentCount: monthPayments._count,
    renewals: renewals.slice(0, 10),
    signupsByMonth,
    totalGmv: D(gmvAggregate._sum.grandTotal ?? 0).toFixed(2),
    topTenants,
  };
}
