import "server-only";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

type Period = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL_TIME";

function getDateRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  if (period === "TODAY") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "THIS_WEEK") {
    const day = from.getDay();
    from.setDate(from.getDate() - day);
    from.setHours(0, 0, 0, 0);
  } else if (period === "THIS_MONTH") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setFullYear(2000);
  }
  return { from, to };
}

export async function getSalesSummary(period: Period = "TODAY") {
  const ctx = await requirePermission("VIEW_REPORTS");
  const { from, to } = getDateRange(period);

  const sales = await db.sale.findMany({
    where: {
      businessId: ctx.business.id,
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
    select: {
      grandTotal: true,
      amountPaid: true,
      amountDue: true,
      paymentStatus: true,
    },
  });

  const totalSales = sales.reduce((s, x) => s.add(D(x.grandTotal)), D(0));
  const totalReceived = sales.reduce((s, x) => s.add(D(x.amountPaid)), D(0));
  const totalUdhaar = sales.reduce((s, x) => s.add(D(x.amountDue)), D(0));
  const billCount = sales.length;
  const udhaarBills = sales.filter((s) => D(s.amountDue).gt(0)).length;

  return {
    totalSales: totalSales.toFixed(2),
    totalReceived: totalReceived.toFixed(2),
    totalUdhaar: totalUdhaar.toFixed(2),
    billCount,
    udhaarBills,
    period,
  };
}

export async function getTopProducts(limit = 10) {
  const ctx = await requirePermission("VIEW_REPORTS");

  const items = await db.saleItem.groupBy({
    by: ["productNameSnapshot"],
    where: { businessId: ctx.business.id, sale: { status: "COMPLETED" } },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });

  return items.map((i) => ({
    name: i.productNameSnapshot,
    totalQty: D(i._sum.quantity ?? 0).toFixed(3),
    totalRevenue: D(i._sum.lineTotal ?? 0).toFixed(2),
  }));
}

export async function getTopCustomers(limit = 10) {
  const ctx = await requirePermission("VIEW_REPORTS");

  const customers = await db.customer.findMany({
    where: {
      businessId: ctx.business.id,
      currentBalance: { gt: 0 },
    },
    select: { id: true, name: true, phone: true, currentBalance: true, lastTransactionAt: true },
    orderBy: { currentBalance: "desc" },
    take: limit,
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    balance: D(c.currentBalance).toFixed(2),
    lastTransactionAt: c.lastTransactionAt,
  }));
}

export async function getUdhaarAgeing() {
  const ctx = await requirePermission("VIEW_REPORTS");
  const now = new Date();

  const entries = await db.ledgerEntry.findMany({
    where: {
      businessId: ctx.business.id,
      // Every udhaar-increasing entry ages — opening balances (purana
      // khata) and manual adjustments, not just credit sales.
      type: { in: ["SALE_CREDIT", "OPENING_BALANCE", "POSITIVE_ADJUSTMENT"] },
      customer: { currentBalance: { gt: 0 } },
    },
    select: { amount: true, createdAt: true },
  });

  let bucket7 = D(0);
  let bucket30 = D(0);
  let bucketOld = D(0);

  for (const e of entries) {
    const days = (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const amt = D(e.amount);
    if (days <= 7) bucket7 = bucket7.add(amt);
    else if (days <= 30) bucket30 = bucket30.add(amt);
    else bucketOld = bucketOld.add(amt);
  }

  return {
    within7Days: bucket7.toFixed(2),
    within30Days: bucket30.toFixed(2),
    older: bucketOld.toFixed(2),
  };
}

export async function getDashboardSummary() {
  const ctx = await requirePermission("VIEW_REPORTS");

  const [todaySummary, totalCustomers, totalProducts, pendingUdhaar] = await Promise.all([
    getSalesSummary("TODAY"),
    db.customer.count({ where: { businessId: ctx.business.id, status: "ACTIVE" } }),
    db.product.count({ where: { businessId: ctx.business.id, status: "ACTIVE" } }),
    db.customer.aggregate({
      where: { businessId: ctx.business.id, currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
      _count: true,
    }),
  ]);

  return {
    today: todaySummary,
    totalCustomers,
    totalProducts,
    totalUdhaarBalance: D(pendingUdhaar._sum.currentBalance ?? 0).toFixed(2),
    udhaarCustomerCount: pendingUdhaar._count,
  };
}
