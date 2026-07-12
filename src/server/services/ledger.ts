import "server-only";
import type { LedgerEntryType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

export interface LedgerFilters {
  customerId?: string;
  type?: LedgerEntryType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listLedgerEntries(filters: LedgerFilters) {
  const ctx = await requirePermission("VIEW_LEDGER");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));

  const where = {
    businessId: ctx.business.id,
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.ledgerEntry.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        sale: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.ledgerEntry.count({ where }),
  ]);

  return { entries, total, page, pageSize };
}

export async function getCustomerLedger(customerId: string) {
  const ctx = await requirePermission("VIEW_LEDGER");

  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
  });
  if (!customer) throw new Error("Customer not found");

  const entries = await db.ledgerEntry.findMany({
    where: { businessId: ctx.business.id, customerId },
    include: {
      createdBy: { select: { name: true } },
      sale: { select: { invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return { customer, entries };
}

export async function setOpeningBalance(customerId: string, amount: string) {
  const ctx = await requirePermission("ADJUST_LEDGER");

  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
  });
  if (!customer) throw new Error("Customer not found");

  const openingAmt = D(amount);
  if (openingAmt.lt(0)) throw new Error("INVALID_AMOUNT");

  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        businessId: ctx.business.id,
        customerId: customer.id,
        type: "OPENING_BALANCE",
        amount: openingAmt.toFixed(2),
        balanceAfter: openingAmt.toFixed(2),
        description: "Opening balance",
        createdById: ctx.user.id,
      },
    });
    await tx.customer.update({
      where: { id: customer.id },
      data: { currentBalance: openingAmt.toFixed(2) },
    });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "OPENING_BALANCE_SET",
        entityType: "Customer",
        entityId: customer.id,
        metadata: { amount: openingAmt.toFixed(2) },
      },
    });
  });
}

export async function adjustBalance(
  customerId: string,
  type: "POSITIVE_ADJUSTMENT" | "NEGATIVE_ADJUSTMENT",
  amount: string,
  note: string
) {
  const ctx = await requirePermission("ADJUST_LEDGER");

  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId: ctx.business.id },
  });
  if (!customer) throw new Error("Customer not found");

  const amt = D(amount);
  if (amt.lte(0)) throw new Error("INVALID_AMOUNT");

  const current = D(customer.currentBalance);
  const signed = type === "POSITIVE_ADJUSTMENT" ? amt : amt.neg();
  const balanceAfter = current.add(signed);

  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        businessId: ctx.business.id,
        customerId: customer.id,
        type,
        amount: signed.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        description: note.trim() || (type === "POSITIVE_ADJUSTMENT" ? "Manual increase" : "Manual decrease"),
        createdById: ctx.user.id,
      },
    });
    await tx.customer.update({
      where: { id: customer.id },
      data: { currentBalance: balanceAfter.toFixed(2) },
    });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "BALANCE_ADJUSTED",
        entityType: "Customer",
        entityId: customer.id,
        metadata: { type, amount: amt.toFixed(2), note },
      },
    });
  });
}
