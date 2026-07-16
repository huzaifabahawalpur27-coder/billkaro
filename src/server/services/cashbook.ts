import "server-only";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import Decimal from "decimal.js";

export async function getCashBookEntries() {
  const ctx = await requirePermission("VIEW_REPORTS", { read: true });

  const entries = await db.cashBookEntry.findMany({
    where: { businessId: ctx.business.id },
    orderBy: { createdAt: "desc" },
  });

  let totalIn = new Decimal(0);
  let totalOut = new Decimal(0);

  entries.forEach((e) => {
    const val = new Decimal(e.amount.toString());
    if (e.type === "CASH_IN") {
      totalIn = totalIn.plus(val);
    } else {
      totalOut = totalOut.plus(val);
    }
  });

  return {
    entries: entries.map(e => ({
      id: e.id,
      amount: e.amount.toString(),
      type: e.type,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    totalIn: totalIn.toString(),
    totalOut: totalOut.toString(),
    netCash: totalIn.minus(totalOut).toString(),
  };
}

export async function createCashBookEntry(input: {
  amount: string;
  type: "CASH_IN" | "CASH_OUT";
  description: string;
}) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const amountVal = parseFloat(input.amount);
  if (isNaN(amountVal) || amountVal <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const entry = await db.cashBookEntry.create({
    data: {
      businessId: ctx.business.id,
      amount: new Decimal(input.amount),
      type: input.type,
      description: input.description.trim() || (input.type === "CASH_IN" ? "Cash In" : "Expense"),
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "CASHBOOK_ENTRY_CREATED",
      entityType: "CashBookEntry",
      entityId: entry.id,
      metadata: { amount: input.amount, type: input.type },
    },
  });

  return entry;
}

export async function deleteCashBookEntry(id: string) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const deleted = await db.cashBookEntry.delete({
    where: {
      id,
      businessId: ctx.business.id,
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "CASHBOOK_ENTRY_DELETED",
      entityType: "CashBookEntry",
      entityId: id,
    },
  });

  return deleted;
}
