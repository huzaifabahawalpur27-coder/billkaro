import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { SalePaymentStatus } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission, hasPermission } from "@/server/auth/guards";
import { D } from "@/lib/money";

export interface BillFilters {
  search?: string;
  customerId?: string;
  paymentStatus?: SalePaymentStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listBills(filters: BillFilters) {
  const ctx = await requirePermission("VIEW_BILLS");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.SaleWhereInput = {
    businessId: ctx.business.id,
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to + "T23:59:59Z") } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { customer: { name: { contains: filters.search, mode: "insensitive" } } },
            { items: { some: { productNameSnapshot: { contains: filters.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [bills, total] = await Promise.all([
    db.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        cashier: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.sale.count({ where }),
  ]);

  return { bills, total, page, pageSize };
}

export async function getBill(saleId: string) {
  const ctx = await requirePermission("VIEW_BILLS");

  const sale = await db.sale.findFirst({
    where: { id: saleId, businessId: ctx.business.id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      cashier: { select: { name: true } },
      cancelledBy: { select: { name: true } },
      items: { orderBy: { id: "asc" } },
      payments: {
        include: { receivedBy: { select: { name: true } } },
        orderBy: { paymentDate: "asc" },
      },
    },
  });
  if (!sale) throw new Error("BILL_NOT_FOUND");

  let originalSaleSnapshot: any = null;
  if (sale.notes && sale.notes.includes("Revised from bill ")) {
    const prefix = "Revised from bill ";
    const index = sale.notes.indexOf(prefix);
    const invoiceNum = sale.notes.slice(index + prefix.length).trim().split(" ")[0];
    if (invoiceNum) {
      const orig = await db.sale.findFirst({
        where: { invoiceNumber: invoiceNum, businessId: ctx.business.id },
        include: {
          items: { orderBy: { id: "asc" } },
        },
      });
      if (orig) {
        originalSaleSnapshot = {
          id: orig.id,
          invoiceNumber: orig.invoiceNumber,
          grandTotal: orig.grandTotal.toString(),
          items: orig.items.map((item) => ({
            productId: item.productId,
            name: item.productNameSnapshot,
            soldPrice: item.soldPrice.toString(),
            quantity: item.quantity.toString(),
            isOpenItem: item.isOpenItem,
          })),
        };
      }
    }
  }

  return {
    sale,
    canCancel: sale.status === "COMPLETED" && hasPermission(ctx, "CANCEL_BILLS"),
    settings: ctx.settings,
    business: ctx.business,
    originalSaleSnapshot,
  };
}

export async function cancelBill(saleId: string, reason: string) {
  const ctx = await requirePermission("CANCEL_BILLS");
  const businessId = ctx.business.id;

  const sale = await db.sale.findFirst({
    where: { id: saleId, businessId },
    include: {
      customer: true,
      items: true,
    },
  });
  if (!sale) throw new Error("BILL_NOT_FOUND");
  if (sale.status !== "COMPLETED") throw new Error("ALREADY_CANCELLED");

  const hadUdhaar = D(sale.amountDue).gt(0) && sale.customerId;

  await db.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: ctx.user.id,
        cancelReason: reason.trim() || "Cancelled",
      },
    });

    if (hadUdhaar && sale.customer) {
      const currentBalance = D(sale.customer.currentBalance);
      const reversal = D(sale.amountDue);
      const newBalance = currentBalance.sub(reversal);

      await tx.ledgerEntry.create({
        data: {
          businessId,
          customerId: sale.customer.id,
          type: "SALE_CANCELLED_REVERSAL",
          amount: reversal.neg().toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          saleId: sale.id,
          description: `Bill cancel — ${sale.invoiceNumber}`,
          createdById: ctx.user.id,
        },
      });

      await tx.customer.update({
        where: { id: sale.customer.id },
        data: { currentBalance: newBalance.toFixed(2) },
      });
    }

    await tx.auditLog.create({
      data: {
        businessId,
        userId: ctx.user.id,
        action: "SALE_CANCELLED",
        entityType: "Sale",
        entityId: sale.id,
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          reason: reason.trim(),
          hadUdhaar,
          amountDue: sale.amountDue.toFixed(2),
        },
      },
    });
  });
}

export async function getBillForPos(saleId: string) {
  const ctx = await requirePermission("CREATE_BILLS"); // Editing a bill requires bill creation permissions
  const sale = await db.sale.findFirst({
    where: { id: saleId, businessId: ctx.business.id },
    include: {
      items: { orderBy: { id: "asc" } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!sale || sale.status !== "COMPLETED") return null;
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    customerId: sale.customerId,
    discountType: sale.discountType,
    discountValue: sale.discountValue.toString(),
    paymentMethod: sale.paymentMethod,
    amountPaid: sale.amountPaid.toString(),
    notes: sale.notes,
    customer: sale.customer ? {
      id: sale.customer.id,
      name: sale.customer.name,
      phone: sale.customer.phone,
    } : null,
    items: sale.items.map(item => ({
      productId: item.productId,
      name: item.productNameSnapshot,
      soldPrice: item.soldPrice.toString(),
      quantity: item.quantity.toString(),
      isOpenItem: item.isOpenItem,
    })),
  };
}
