import "server-only";
import type { DiscountType, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission, hasPermission } from "@/server/auth/guards";
import { D, round2, lineTotal, calculateBill } from "@/lib/money";

// ─────────────────────────────────────────────────────────────
// POS product search
// ─────────────────────────────────────────────────────────────

/** Fast search for the billing screen. Exact barcode/SKU hit first, then name. */
export async function searchProductsForBilling(query: string) {
  const ctx = await requirePermission("CREATE_BILLS", { read: true });
  const q = query.trim();
  if (!q) return [];

  const products = await db.product.findMany({
    where: {
      businessId: ctx.business.id,
      status: "ACTIVE",
      OR: [
        { barcode: q },
        { sku: { equals: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      salePrice: true,
      unit: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 12,
  });

  // Exact barcode/SKU matches float to the top for scanner input.
  const lower = q.toLowerCase();
  return products
    .sort((a, b) => {
      const aExact = a.barcode === q || a.sku?.toLowerCase() === lower ? 0 : 1;
      const bExact = b.barcode === q || b.sku?.toLowerCase() === lower ? 0 : 1;
      return aExact - bExact;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      salePrice: p.salePrice.toFixed(2),
      unitName: p.unit?.name ?? null,
    }));
}

// ─────────────────────────────────────────────────────────────
// Create sale — the atomic billing transaction
// ─────────────────────────────────────────────────────────────

export interface SaleItemInput {
  /** Catalogue product; null/undefined for open price items. */
  productId?: string | null;
  /** Required for open items; ignored for catalogue items. */
  name?: string;
  soldPrice: string;
  quantity: string;
}

export interface CreateSaleInput {
  items: SaleItemInput[];
  discountType: DiscountType;
  discountValue: string;
  customerId?: string | null;
  paymentMethod: PaymentMethod;
  /** Amount actually received now. grandTotal - amountPaid becomes udhaar. */
  amountPaid: string;
  /** Cash tendered (CASH only) — used to compute change, display only. */
  cashReceived?: string | null;
  notes?: string | null;
}

export class SaleValidationError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
    this.name = "SaleValidationError";
  }
}

export async function createSale(input: CreateSaleInput) {
  const ctx = await requirePermission("CREATE_BILLS");
  const businessId = ctx.business.id;

  if (!input.items.length) throw new SaleValidationError("EMPTY_BILL");
  if (input.items.length > 200) throw new SaleValidationError("TOO_MANY_ITEMS");

  const discounting = input.discountType !== "NONE" && D(input.discountValue).gt(0);
  if (discounting && !hasPermission(ctx, "APPLY_DISCOUNTS")) {
    throw new SaleValidationError("DISCOUNT_NOT_ALLOWED");
  }
  const canChangePrice = hasPermission(ctx, "CHANGE_SALE_PRICE");

  // Re-resolve catalogue products server-side: ownership check + price snapshot.
  const productIds = [
    ...new Set(input.items.map((i) => i.productId).filter((id): id is string => !!id)),
  ];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId, status: "ACTIVE" },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = input.items.map((item) => {
    const qty = D(item.quantity);
    if (qty.lte(0) || qty.gt(100000)) throw new SaleValidationError("INVALID_QUANTITY");

    if (item.productId) {
      const product = productMap.get(item.productId);
      if (!product) throw new SaleValidationError("PRODUCT_NOT_FOUND");
      const catalogue = D(product.salePrice);
      // Without CHANGE_SALE_PRICE the catalogue price always wins.
      const sold = canChangePrice ? D(item.soldPrice) : catalogue;
      if (sold.lt(0)) throw new SaleValidationError("INVALID_PRICE");
      return {
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        cataloguePrice: catalogue.toFixed(2),
        soldPrice: sold.toFixed(2),
        quantity: qty.toFixed(3),
        lineTotal: lineTotal(sold, qty).toFixed(2),
        isOpenItem: false,
      };
    }

    const name = item.name?.trim();
    if (!name) throw new SaleValidationError("OPEN_ITEM_NAME_REQUIRED");
    const sold = D(item.soldPrice);
    if (sold.lte(0)) throw new SaleValidationError("INVALID_PRICE");
    return {
      productId: null,
      productNameSnapshot: name,
      skuSnapshot: null,
      cataloguePrice: null,
      soldPrice: sold.toFixed(2),
      quantity: qty.toFixed(3),
      lineTotal: lineTotal(sold, qty).toFixed(2),
      isOpenItem: true,
    };
  });

  const totals = calculateBill({
    items: items.map((i) => ({ soldPrice: i.soldPrice, quantity: i.quantity })),
    discountType: input.discountType,
    discountValue: discounting ? input.discountValue : 0,
    taxRate: ctx.settings.defaultTaxRate,
  });
  if (totals.grandTotal.lte(0)) throw new SaleValidationError("EMPTY_BILL");

  let amountPaid = round2(D(input.amountPaid));
  if (amountPaid.lt(0)) throw new SaleValidationError("INVALID_AMOUNT_PAID");
  if (amountPaid.gt(totals.grandTotal)) amountPaid = totals.grandTotal;
  const amountDue = totals.grandTotal.sub(amountPaid);

  // Any unpaid amount becomes udhaar and needs a khata customer.
  let customer = null;
  if (input.customerId) {
    customer = await db.customer.findFirst({
      where: { id: input.customerId, businessId, status: "ACTIVE" },
    });
    if (!customer) throw new SaleValidationError("CUSTOMER_NOT_FOUND");
  }
  if (amountDue.gt(0) && !customer) throw new SaleValidationError("CUSTOMER_REQUIRED");

  const paymentStatus = amountDue.lte(0) ? "PAID" : amountPaid.gt(0) ? "PARTIAL" : "UDHAAR";

  let cashReceived: string | null = null;
  let changeDue: string | null = null;
  if (input.paymentMethod === "CASH" && input.cashReceived) {
    const tendered = round2(D(input.cashReceived));
    if (tendered.gte(amountPaid)) {
      cashReceived = tendered.toFixed(2);
      changeDue = tendered.sub(amountPaid).toFixed(2);
    }
  }

  const sale = await db.$transaction(async (tx) => {
    // Gapless invoice number: lock the counter row for this transaction.
    const counters = await tx.$queryRaw<{ id: string; nextNumber: number }[]>`
      SELECT id, "nextNumber" FROM "DocumentCounter"
      WHERE "businessId" = ${businessId} AND key = 'INVOICE'
      FOR UPDATE`;
    if (!counters.length) throw new Error("COUNTER_MISSING");
    const counter = counters[0];
    await tx.documentCounter.update({
      where: { id: counter.id },
      data: { nextNumber: counter.nextNumber + 1 },
    });
    const invoiceNumber = `${ctx.settings.invoicePrefix}-${String(counter.nextNumber).padStart(6, "0")}`;

    const sale = await tx.sale.create({
      data: {
        businessId,
        invoiceNumber,
        customerId: customer?.id ?? null,
        cashierId: ctx.user.id,
        status: "COMPLETED",
        paymentStatus,
        paymentMethod: input.paymentMethod,
        subtotal: totals.subtotal.toFixed(2),
        discountType: discounting ? input.discountType : "NONE",
        discountValue: discounting ? round2(D(input.discountValue)).toFixed(2) : "0",
        discountAmount: totals.discountAmount.toFixed(2),
        taxRate: ctx.settings.defaultTaxRate,
        taxAmount: totals.taxAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        amountPaid: amountPaid.toFixed(2),
        amountDue: amountDue.toFixed(2),
        cashReceived,
        changeDue,
        notes: input.notes?.trim() || null,
        items: { create: items.map((i) => ({ ...i, businessId })) },
      },
    });

    if (amountPaid.gt(0)) {
      await tx.payment.create({
        data: {
          businessId,
          saleId: sale.id,
          customerId: customer?.id ?? null,
          amount: amountPaid.toFixed(2),
          method: input.paymentMethod,
          receivedById: ctx.user.id,
        },
      });
    }

    if (amountDue.gt(0) && customer) {
      const balanceAfter = D(customer.currentBalance).add(amountDue);
      await tx.ledgerEntry.create({
        data: {
          businessId,
          customerId: customer.id,
          type: "SALE_CREDIT",
          amount: amountDue.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          saleId: sale.id,
          description: `Bill ${invoiceNumber}`,
          createdById: ctx.user.id,
        },
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: balanceAfter.toFixed(2),
          lastTransactionAt: new Date(),
        },
      });
    } else if (customer) {
      await tx.customer.update({
        where: { id: customer.id },
        data: { lastTransactionAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        businessId,
        userId: ctx.user.id,
        action: "SALE_CREATED",
        entityType: "Sale",
        entityId: sale.id,
        metadata: {
          invoiceNumber,
          grandTotal: totals.grandTotal.toFixed(2),
          amountPaid: amountPaid.toFixed(2),
          amountDue: amountDue.toFixed(2),
          paymentStatus,
          items: items.length,
          customer: customer?.name ?? null,
        },
      },
    });

    return sale;
  });

  return {
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    grandTotal: sale.grandTotal.toFixed(2),
    amountPaid: sale.amountPaid.toFixed(2),
    amountDue: sale.amountDue.toFixed(2),
    changeDue: sale.changeDue?.toFixed(2) ?? null,
    paymentStatus,
    customerName: customer?.name ?? null,
  };
}
