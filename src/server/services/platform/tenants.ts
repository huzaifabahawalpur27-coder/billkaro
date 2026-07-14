import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import {
  computeSubscriptionState,
  type SubscriptionStatus,
} from "@/server/platform/subscription-state";
import { logPlatformAction } from "./audit";

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
        include: { user: { select: { name: true, email: true } }, role: { select: { name: true } } },
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
