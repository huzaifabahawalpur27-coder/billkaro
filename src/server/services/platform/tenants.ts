import "server-only";
import ExcelJS from "exceljs";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/passwords";
import { createBusinessForUser } from "@/server/services/onboarding";
import { D } from "@/lib/money";
import {
  computeSubscriptionState,
  type SubscriptionStatus,
} from "@/server/platform/subscription-state";
import { logPlatformAction } from "./audit";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TenantFilters {
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
  page?: number;
}

const subscriptionInclude = {
  subscription: { include: { plan: { select: { id: true, name: true } } } },
  _count: { select: { members: true } },
} satisfies Prisma.BusinessInclude;

function toTenantRow(b: {
  id: string;
  name: string;
  ownerName: string;
  phone: string | null;
  status: string;
  suspendedReason: string | null;
  createdAt: Date;
  subscription:
    | ({
        trialEndsAt: Date | null;
        paidUntil: Date | null;
        graceDays: number;
        cancelledAt: Date | null;
        plan: { id: string; name: string };
      })
    | null;
  _count: { members: number };
}) {
  const state = computeSubscriptionState(b.subscription);
  return {
    id: b.id,
    name: b.name,
    ownerName: b.ownerName,
    phone: b.phone,
    status: b.status as "ACTIVE" | "SUSPENDED",
    suspendedReason: b.suspendedReason,
    createdAt: b.createdAt.toISOString(),
    memberCount: b._count.members,
    planName: b.subscription?.plan.name ?? null,
    subscriptionStatus: state.status as SubscriptionStatus,
    effectiveUntil: state.effectiveUntil?.toISOString() ?? null,
    daysLeft: state.daysLeft,
  };
}

export type TenantRow = ReturnType<typeof toTenantRow>;

export async function listTenants(filters: TenantFilters = {}) {
  await requirePlatformAdmin();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 25;

  const where: Prisma.BusinessWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { ownerName: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [businesses, total] = await Promise.all([
    db.business.findMany({
      where,
      include: subscriptionInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.business.count({ where }),
  ]);

  return { tenants: businesses.map(toTenantRow), total, page, pageSize };
}

export async function getTenant(businessId: string) {
  await requirePlatformAdmin();
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      ...subscriptionInclude,
      settings: { select: { currencySymbol: true } },
      members: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              isPlatformAdmin: true,
              _count: { select: { memberships: true } },
            },
          },
          role: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!business) return null;

  const [payments, stats] = await Promise.all([
    db.platformPayment.findMany({
      where: { businessId },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.sale.aggregate({
      where: { businessId, status: "COMPLETED" },
      _count: true,
      _max: { createdAt: true },
    }),
  ]);

  const sub = business.subscription;
  const state = computeSubscriptionState(sub);
  return {
    tenant: toTenantRow(business),
    address: business.address,
    businessType: business.businessType,
    suspendedAt: business.suspendedAt?.toISOString() ?? null,
    members: business.members.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role.name,
      status: m.status,
      isPlatformAdmin: m.user.isPlatformAdmin,
      membershipCount: m.user._count.memberships,
    })),
    subscription: sub
      ? {
          planId: sub.planId,
          planName: sub.plan.name,
          startedAt: sub.startedAt.toISOString(),
          trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
          paidUntil: sub.paidUntil?.toISOString() ?? null,
          graceDays: sub.graceDays,
          status: state.status,
          effectiveUntil: state.effectiveUntil?.toISOString() ?? null,
          daysLeft: state.daysLeft,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount.toFixed(2),
      method: p.method,
      reference: p.reference,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      recordedBy: p.recordedBy.name,
      createdAt: p.createdAt.toISOString(),
    })),
    totalBills: stats._count,
    lastSaleAt: stats._max.createdAt?.toISOString() ?? null,
  };
}

export interface TenantUpdateInput {
  name: string;
  ownerName: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function updateTenant(businessId: string, input: TenantUpdateInput) {
  const { user } = await requirePlatformAdmin();
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error("TENANT_NOT_FOUND");

  await db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        name: input.name.trim(),
        ownerName: input.ownerName.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
      },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "TENANT_UPDATED",
      targetBusinessId: businessId,
      metadata: { name: input.name.trim() },
    });
  });
}

export async function suspendTenant(businessId: string, reason: string) {
  const { user } = await requirePlatformAdmin();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("REASON_REQUIRED");

  await db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: trimmed },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "TENANT_SUSPENDED",
      targetBusinessId: businessId,
      metadata: { reason: trimmed },
    });
  });
}

export async function activateTenant(businessId: string) {
  const { user } = await requirePlatformAdmin();
  await db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "TENANT_ACTIVATED",
      targetBusinessId: businessId,
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Admin-side tenant creation
// ─────────────────────────────────────────────────────────────

export interface CreateTenantInput {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone?: string | null;
  planId?: string | null;
  trialDays?: number | null;
}

/**
 * Admin-created tenant (phone onboarding). If the email already belongs to
 * a user, that user is attached as Owner of the new business and their
 * password is NEVER overwritten.
 */
export async function createTenant(input: CreateTenantInput) {
  const { user: admin } = await requirePlatformAdmin();

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing?.isPlatformAdmin) throw new Error("CANNOT_ATTACH_ADMIN");

  const plan = input.planId
    ? await db.plan.findUnique({ where: { id: input.planId } })
    : null;
  if (input.planId && (!plan || !plan.isActive)) throw new Error("PLAN_NOT_FOUND");

  // bcrypt is slow by design — hash outside the transaction.
  const passwordHash = existing ? null : await hashPassword(input.password);

  const businessId = await db.$transaction(async (tx) => {
    const user =
      existing ??
      (await tx.user.create({
        data: {
          email: input.email,
          passwordHash: passwordHash!,
          name: input.ownerName.trim(),
          phone: input.phone?.trim() || null,
        },
      }));

    const business = await createBusinessForUser(tx, user.id, {
      name: input.businessName.trim(),
      ownerName: input.ownerName.trim(),
      phone: input.phone?.trim() || undefined,
    });

    if (plan) {
      await tx.subscription.create({
        data: {
          businessId: business.id,
          planId: plan.id,
          trialEndsAt: input.trialDays
            ? new Date(Date.now() + input.trialDays * DAY_MS)
            : null,
        },
      });
    }

    await logPlatformAction(tx, {
      actorId: admin.id,
      action: "TENANT_CREATED",
      targetBusinessId: business.id,
      metadata: {
        name: input.businessName.trim(),
        email: input.email,
        attachedExistingUser: !!existing,
        plan: plan?.name ?? null,
        trialDays: input.trialDays ?? null,
      },
    });

    return business.id;
  });

  return { businessId, attachedExistingUser: !!existing };
}

// ─────────────────────────────────────────────────────────────
// Tenant deletion — hard, gated on SUSPENDED + name confirmation
// ─────────────────────────────────────────────────────────────

export async function deleteTenant(businessId: string, confirmName: string) {
  const { user: admin } = await requirePlatformAdmin();

  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { members: { select: { userId: true } } },
  });
  if (!business) throw new Error("TENANT_NOT_FOUND");
  // Suspension first: blocks logins and kills live sessions, so nobody is
  // mid-bill while their tenant is being erased.
  if (business.status !== "SUSPENDED") throw new Error("NOT_SUSPENDED");
  if (confirmName.trim() !== business.name) throw new Error("NAME_MISMATCH");

  const memberUserIds = business.members.map((m) => m.userId);
  const totalBills = await db.sale.count({ where: { businessId } });

  const deletedUsers = await db.$transaction(
    async (tx) => {
      // Must run BEFORE the cascade removes the membership rows.
      const soleUsers = await tx.user.findMany({
        where: {
          id: { in: memberUserIds },
          isPlatformAdmin: false,
          memberships: { every: { businessId } },
        },
        select: { id: true },
      });

      // Cascades every tenant row, clearing the Restrict FKs
      // (Sale.cashierId etc.) that would otherwise block user deletion.
      await tx.business.delete({ where: { id: businessId } });

      await tx.user.deleteMany({ where: { id: { in: soleUsers.map((u) => u.id) } } });

      await logPlatformAction(tx, {
        actorId: admin.id,
        action: "TENANT_DELETED",
        targetBusinessId: businessId,
        metadata: {
          name: business.name,
          memberCount: memberUserIds.length,
          deletedUsers: soleUsers.length,
          totalBills,
        },
      });

      return soleUsers.length;
    },
    { timeout: 30_000 }
  );

  return { deletedUsers };
}

// ─────────────────────────────────────────────────────────────
// Per-tenant usage stats
// ─────────────────────────────────────────────────────────────

export async function getTenantStats(businessId: string) {
  await requirePlatformAdmin();
  const last30d = new Date(Date.now() - 30 * DAY_MS);

  const [sales30d, salesAll, products, customers, udhaar] = await Promise.all([
    db.sale.aggregate({
      where: { businessId, status: "COMPLETED", createdAt: { gte: last30d } },
      _count: true,
      _sum: { grandTotal: true },
    }),
    db.sale.aggregate({
      where: { businessId, status: "COMPLETED" },
      _sum: { grandTotal: true },
    }),
    db.product.count({ where: { businessId, status: "ACTIVE" } }),
    db.customer.count({ where: { businessId, status: "ACTIVE" } }),
    db.customer.aggregate({
      where: { businessId, currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
      _count: true,
    }),
  ]);

  return {
    sales30d: D(sales30d._sum.grandTotal ?? 0).toFixed(2),
    bills30d: sales30d._count,
    gmvAllTime: D(salesAll._sum.grandTotal ?? 0).toFixed(2),
    activeProducts: products,
    activeCustomers: customers,
    outstandingUdhaar: D(udhaar._sum.currentBalance ?? 0).toFixed(2),
    udhaarCustomers: udhaar._count,
  };
}

export type TenantStats = Awaited<ReturnType<typeof getTenantStats>>;

// ─────────────────────────────────────────────────────────────
// Tenants XLSX export
// ─────────────────────────────────────────────────────────────

export async function exportTenantsXlsx(): Promise<Buffer> {
  await requirePlatformAdmin();

  const businesses = await db.business.findMany({
    include: subscriptionInclude,
    orderBy: { createdAt: "asc" },
  });
  const rows = businesses.map(toTenantRow);

  const wb = new ExcelJS.Workbook();
  wb.creator = "BillKaro Platform";
  const ws = wb.addWorksheet("Tenants");
  ws.columns = [
    { header: "Business", key: "name", width: 28 },
    { header: "Owner", key: "ownerName", width: 22 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Plan", key: "planName", width: 14 },
    { header: "Subscription", key: "subscriptionStatus", width: 14 },
    { header: "Coverage Until", key: "effectiveUntil", width: 16 },
    { header: "Users", key: "memberCount", width: 8 },
    { header: "Created", key: "createdAt", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      ...r,
      planName: r.planName ?? "",
      effectiveUntil: r.effectiveUntil ? r.effectiveUntil.slice(0, 10) : "",
      createdAt: r.createdAt.slice(0, 10),
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
