import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

// ── Billing screen helpers ────────────────────────────────────

/** Customer picker on the billing screen. Name or phone. */
export async function searchCustomersForBilling(query: string) {
  const ctx = await requirePermission("CREATE_BILLS", { read: true });
  const q = query.trim();

  const customers = await db.customer.findMany({
    where: {
      businessId: ctx.business.id,
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, phone: true, currentBalance: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    currentBalance: c.currentBalance.toFixed(2),
  }));
}

/** Quick-add from the billing screen when a udhaar customer is new. */
export async function quickCreateCustomer(name: string, phone?: string | null) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("NAME_REQUIRED");

  const customer = await db.customer.create({
    data: {
      businessId: ctx.business.id,
      name: trimmed,
      phone: phone?.trim() || null,
    },
  });
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    currentBalance: customer.currentBalance.toFixed(2),
  };
}

// ── Full CRUD ─────────────────────────────────────────────────

export interface CustomerFilters {
  search?: string;
  hasBalance?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  page?: number;
  pageSize?: number;
}

export async function listCustomers(filters: CustomerFilters = {}) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS", { read: true });
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.CustomerWhereInput = {
    businessId: ctx.business.id,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.hasBalance ? { currentBalance: { gt: 0 } } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      currentBalance: c.currentBalance.toFixed(2),
    })),
    total,
    page,
    pageSize,
  };
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  creditLimit?: string | null;
}

export async function createCustomer(input: CustomerInput) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS");
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("NAME_REQUIRED");

  const customer = await db.customer.create({
    data: {
      businessId: ctx.business.id,
      name: trimmed,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      creditLimit: input.creditLimit ? D(input.creditLimit).toFixed(2) : null,
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { name: customer.name },
    },
  });

  return { ...customer, currentBalance: customer.currentBalance.toFixed(2) };
}

export async function updateCustomer(customerId: string, input: CustomerInput) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS");
  const existing = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
  });
  if (!existing) throw new Error("CUSTOMER_NOT_FOUND");

  const customer = await db.customer.update({
    where: { id: existing.id },
    data: {
      name: input.name.trim() || existing.name,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      creditLimit: input.creditLimit ? D(input.creditLimit).toFixed(2) : null,
    },
  });

  return { ...customer, currentBalance: customer.currentBalance.toFixed(2) };
}

export async function setCustomerStatus(customerId: string, active: boolean) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS");
  const existing = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
  });
  if (!existing) throw new Error("CUSTOMER_NOT_FOUND");

  await db.customer.update({
    where: { id: existing.id },
    data: { status: active ? "ACTIVE" : "INACTIVE" },
  });
}

export async function getCustomerSummary(customerId: string) {
  const ctx = await requirePermission("MANAGE_CUSTOMERS", { read: true });
  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
    include: {
      _count: { select: { sales: true, payments: true } },
    },
  });
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

  const [totalBilled, totalPaid] = await Promise.all([
    db.sale.aggregate({
      where: { businessId: ctx.business.id, customerId, status: "COMPLETED" },
      _sum: { grandTotal: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: { businessId: ctx.business.id, customerId },
      _sum: { amount: true },
    }),
  ]);

  return {
    customer: { ...customer, currentBalance: customer.currentBalance.toFixed(2) },
    totalBilled: D(totalBilled._sum.grandTotal ?? 0).toFixed(2),
    billCount: totalBilled._count,
    totalPaid: D(totalPaid._sum.amount ?? 0).toFixed(2),
  };
}
