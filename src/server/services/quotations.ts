import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DiscountType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D, lineTotal, calculateBill } from "@/lib/money";
import type { SaleItemInput } from "./billing";

const DAY_MS = 24 * 60 * 60 * 1000;

export class QuotationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "QuotationError";
  }
}

/** Derived display status — EXPIRED is computed, never stored. */
export function quotationDisplayStatus(q: {
  status: string;
  validUntil: Date;
}): "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELLED" {
  if (q.status === "CONVERTED" || q.status === "CANCELLED") return q.status;
  return q.validUntil < new Date() ? "EXPIRED" : "ACTIVE";
}

export interface CreateQuotationInput {
  items: SaleItemInput[];
  discountType: DiscountType;
  discountValue: string;
  customerId?: string | null;
  customerName?: string | null;
  validityDays?: number | null;
  notes?: string | null;
}

export async function createQuotation(input: CreateQuotationInput) {
  const ctx = await requirePermission("CREATE_BILLS");
  const businessId = ctx.business.id;
  if (!ctx.settings.quotationsEnabled) throw new QuotationError("QUOTATIONS_DISABLED");

  if (!input.items.length) throw new QuotationError("EMPTY_QUOTATION");
  if (input.items.length > 200) throw new QuotationError("TOO_MANY_ITEMS");

  // Same snapshot rules as createSale — quoted prices come from the cart.
  const productIds = [
    ...new Set(input.items.map((i) => i.productId).filter((id): id is string => !!id)),
  ];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId, status: "ACTIVE" },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = input.items.map((item) => {
    const qty = D(item.quantity);
    if (qty.lte(0) || qty.gt(100000)) throw new QuotationError("INVALID_QUANTITY");
    const sold = D(item.soldPrice);
    if (sold.lte(0)) throw new QuotationError("INVALID_PRICE");

    if (item.productId) {
      const product = productMap.get(item.productId);
      if (!product) throw new QuotationError("PRODUCT_NOT_FOUND");
      return {
        businessId,
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        cataloguePrice: D(product.salePrice).toFixed(2),
        soldPrice: sold.toFixed(2),
        quantity: qty.toFixed(3),
        lineTotal: lineTotal(sold, qty).toFixed(2),
        isOpenItem: false,
      };
    }
    const name = item.name?.trim();
    if (!name) throw new QuotationError("OPEN_ITEM_NAME_REQUIRED");
    return {
      businessId,
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

  const discounting = input.discountType !== "NONE" && D(input.discountValue).gt(0);
  const totals = calculateBill({
    items: items.map((i) => ({ soldPrice: i.soldPrice, quantity: i.quantity })),
    discountType: input.discountType,
    discountValue: discounting ? input.discountValue : 0,
    taxRate: ctx.settings.defaultTaxRate,
  });
  if (totals.grandTotal.lte(0)) throw new QuotationError("EMPTY_QUOTATION");

  let customer = null;
  if (input.customerId) {
    customer = await db.customer.findFirst({
      where: { id: input.customerId, businessId, status: "ACTIVE" },
    });
    if (!customer) throw new QuotationError("CUSTOMER_NOT_FOUND");
  }

  const validityDays = Math.min(
    365,
    Math.max(1, Math.trunc(input.validityDays ?? ctx.settings.quotationValidityDays))
  );
  const validUntil = new Date(Date.now() + validityDays * DAY_MS);

  const quotation = await db.$transaction(async (tx) => {
    const counters = await tx.$queryRaw<{ id: string; nextNumber: number }[]>`
      SELECT id, "nextNumber" FROM "DocumentCounter"
      WHERE "businessId" = ${businessId} AND key = 'QUOTATION'
      FOR UPDATE`;
    if (!counters.length) throw new Error("COUNTER_MISSING");
    const counter = counters[0];
    await tx.documentCounter.update({
      where: { id: counter.id },
      data: { nextNumber: counter.nextNumber + 1 },
    });
    const quotationNumber = `${ctx.settings.quotationPrefix}-${String(counter.nextNumber).padStart(6, "0")}`;

    const quotation = await tx.quotation.create({
      data: {
        businessId,
        quotationNumber,
        customerId: customer?.id ?? null,
        customerName: customer ? null : input.customerName?.trim() || null,
        createdById: ctx.user.id,
        subtotal: totals.subtotal.toFixed(2),
        discountType: discounting ? input.discountType : "NONE",
        discountValue: discounting ? D(input.discountValue).toFixed(2) : "0",
        discountAmount: totals.discountAmount.toFixed(2),
        taxRate: ctx.settings.defaultTaxRate,
        taxAmount: totals.taxAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        validUntil,
        notes: input.notes?.trim() || null,
        items: { create: items },
      },
    });

    await tx.auditLog.create({
      data: {
        businessId,
        userId: ctx.user.id,
        action: "QUOTATION_CREATED",
        entityType: "Quotation",
        entityId: quotation.id,
        metadata: {
          quotationNumber,
          grandTotal: totals.grandTotal.toFixed(2),
          items: items.length,
          customer: customer?.name ?? input.customerName ?? null,
        },
      },
    });

    return quotation;
  });

  return {
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    grandTotal: quotation.grandTotal.toFixed(2),
    validUntil: quotation.validUntil.toISOString(),
    customerName: customer?.name ?? input.customerName ?? null,
  };
}

export interface QuotationFilters {
  search?: string;
  status?: "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELLED";
  page?: number;
}

export async function listQuotations(filters: QuotationFilters = {}) {
  const ctx = await requirePermission("VIEW_BILLS");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 25;
  const now = new Date();

  const where: Prisma.QuotationWhereInput = {
    businessId: ctx.business.id,
    ...(filters.search
      ? {
          OR: [
            { quotationNumber: { contains: filters.search, mode: "insensitive" } },
            { customerName: { contains: filters.search, mode: "insensitive" } },
            { customer: { name: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
    // Status filter: ACTIVE/EXPIRED split the stored ACTIVE rows by validUntil.
    ...(filters.status === "ACTIVE"
      ? { status: "ACTIVE", validUntil: { gte: now } }
      : filters.status === "EXPIRED"
        ? { status: "ACTIVE", validUntil: { lt: now } }
        : filters.status
          ? { status: filters.status }
          : {}),
  };

  const [quotations, total] = await Promise.all([
    db.quotation.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.quotation.count({ where }),
  ]);

  return {
    quotations: quotations.map((q) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      customerName: q.customer?.name ?? q.customerName ?? null,
      grandTotal: q.grandTotal.toFixed(2),
      itemCount: q._count.items,
      validUntil: q.validUntil.toISOString(),
      status: quotationDisplayStatus(q),
      convertedSaleId: q.convertedSaleId,
      createdAt: q.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getQuotation(quotationId: string) {
  const ctx = await requirePermission("VIEW_BILLS");
  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, businessId: ctx.business.id },
    include: {
      items: true,
      customer: { select: { name: true, phone: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!quotation) return null;
  return {
    quotation,
    displayStatus: quotationDisplayStatus(quotation),
    settings: ctx.settings,
    business: ctx.business,
  };
}

export async function cancelQuotation(quotationId: string) {
  const ctx = await requirePermission("CREATE_BILLS");
  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, businessId: ctx.business.id },
  });
  if (!quotation) throw new QuotationError("QUOTATION_NOT_FOUND");
  if (quotation.status !== "ACTIVE") throw new QuotationError("NOT_ACTIVE");

  await db.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "CANCELLED" },
    });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "QUOTATION_CANCELLED",
        entityType: "Quotation",
        entityId: quotation.id,
        metadata: { quotationNumber: quotation.quotationNumber },
      },
    });
  });
}

/**
 * Cart-ready lines for the convert-to-bill flow. Catalogue items are
 * re-resolved to CURRENT prices (the cashier reviews them in the POS);
 * deleted/inactive products degrade to open items carrying the quoted
 * name and price — conversion is never blocked.
 */
export async function getQuotationForPos(quotationId: string) {
  const ctx = await requirePermission("CREATE_BILLS");
  const quotation = await db.quotation.findFirst({
    where: { id: quotationId, businessId: ctx.business.id },
    include: {
      items: true,
      customer: { select: { id: true, name: true, phone: true, currentBalance: true } },
    },
  });
  if (!quotation) return null;

  const productIds = quotation.items
    .map((i) => i.productId)
    .filter((id): id is string => !!id);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, businessId: ctx.business.id, status: "ACTIVE" },
    include: { unit: { select: { name: true, isFractional: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lines = quotation.items.map((item) => {
    const product = item.productId ? productMap.get(item.productId) : null;
    if (product) {
      return {
        productId: product.id,
        name: product.name,
        unitName: product.unit?.name ?? null,
        isFractional: product.unit?.isFractional ?? false,
        cataloguePrice: product.salePrice.toFixed(2),
        soldPrice: product.salePrice.toFixed(2), // current rate — cashier reviews
        quantity: item.quantity.toString(),
        isOpenItem: false,
      };
    }
    return {
      productId: null,
      name: item.productNameSnapshot,
      unitName: null,
      isFractional: false,
      cataloguePrice: null,
      soldPrice: item.soldPrice.toFixed(2), // quoted price carries over
      quantity: item.quantity.toString(),
      isOpenItem: true,
    };
  });

  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status: quotationDisplayStatus(quotation),
    lines,
    customer: quotation.customer
      ? {
          id: quotation.customer.id,
          name: quotation.customer.name,
          phone: quotation.customer.phone,
          currentBalance: quotation.customer.currentBalance.toFixed(2),
        }
      : null,
  };
}
