import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

export interface ReceivePaymentInput {
  customerId: string;
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

export async function receivePayment(input: ReceivePaymentInput) {
  const ctx = await requirePermission("RECEIVE_PAYMENTS");
  const businessId = ctx.business.id;

  const customer = await db.customer.findFirst({
    where: { id: input.customerId, businessId, status: "ACTIVE" },
  });
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

  const amount = D(input.amount);
  if (amount.lte(0)) throw new Error("INVALID_AMOUNT");

  const newBalance = D(customer.currentBalance).sub(amount);

  return db.$transaction(async (tx) => {
    // Gapless PAY receipt number
    const counters = await tx.$queryRaw<{ id: string; nextNumber: number }[]>`
      SELECT id, "nextNumber" FROM "DocumentCounter"
      WHERE "businessId" = ${businessId} AND key = 'PAYMENT'
      FOR UPDATE`;
    if (!counters.length) throw new Error("COUNTER_MISSING");
    const counter = counters[0];
    await tx.documentCounter.update({
      where: { id: counter.id },
      data: { nextNumber: counter.nextNumber + 1 },
    });
    const receiptNumber = `${ctx.settings.receiptPrefix}-${String(counter.nextNumber).padStart(6, "0")}`;

    const payment = await tx.payment.create({
      data: {
        businessId,
        receiptNumber,
        customerId: customer.id,
        amount: amount.toFixed(2),
        method: input.method,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        receivedById: ctx.user.id,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        businessId,
        customerId: customer.id,
        type: "PAYMENT_RECEIVED",
        amount: amount.neg().toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        paymentId: payment.id,
        description: `Payment received — ${receiptNumber}`,
        createdById: ctx.user.id,
      },
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        currentBalance: newBalance.toFixed(2),
        lastPaymentAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        businessId,
        userId: ctx.user.id,
        action: "PAYMENT_RECEIVED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          receiptNumber,
          customer: customer.name,
          amount: amount.toFixed(2),
          method: input.method,
        },
      },
    });

    return { payment, receiptNumber, newBalance: newBalance.toFixed(2) };
  });
}

export async function listPayments(filters: {
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const ctx = await requirePermission("RECEIVE_PAYMENTS");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where = {
    businessId: ctx.business.id,
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.payment.count({ where }),
  ]);

  return { payments, total, page, pageSize };
}
