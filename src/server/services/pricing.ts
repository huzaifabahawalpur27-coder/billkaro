import "server-only";
import type { PriceType, RoundingRule } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { D, adjustByPercent } from "@/lib/money";

export interface BulkPriceParams {
  /** Either a brand… */
  brandId?: string;
  /** …or an explicit product selection. */
  productIds?: string[];
  priceType: PriceType;
  direction: "INCREASE" | "DECREASE";
  percent: string;
  rounding: RoundingRule;
}

export interface BulkPreviewRow {
  productId: string;
  name: string;
  oldPrice: string | null;
  newPrice: string;
}

function priceField(priceType: PriceType) {
  return priceType === "SALE"
    ? ("salePrice" as const)
    : priceType === "PURCHASE"
      ? ("purchasePrice" as const)
      : ("wholesalePrice" as const);
}

async function resolveTargets(businessId: string, params: BulkPriceParams) {
  if (!params.brandId && !params.productIds?.length) throw new Error("NO_TARGET");
  const percent = D(params.percent);
  if (percent.lte(0) || percent.gt(500)) throw new Error("INVALID_PERCENT");

  return db.product.findMany({
    where: {
      businessId,
      ...(params.brandId ? { brandId: params.brandId } : {}),
      ...(params.productIds?.length ? { id: { in: params.productIds } } : {}),
      status: "ACTIVE",
    },
    orderBy: { name: "asc" },
  });
}

function computeRows(
  products: Awaited<ReturnType<typeof resolveTargets>>,
  params: BulkPriceParams
): BulkPreviewRow[] {
  const field = priceField(params.priceType);
  const rows: BulkPreviewRow[] = [];
  for (const p of products) {
    const current = p[field];
    if (current == null) continue; // product has no price of this type
    const next = adjustByPercent(current.toString(), params.percent, params.direction, params.rounding);
    rows.push({
      productId: p.id,
      name: p.name,
      oldPrice: D(current.toString()).toFixed(2),
      newPrice: next.toFixed(2),
    });
  }
  return rows;
}

export async function previewBulkPriceUpdate(params: BulkPriceParams) {
  const ctx = await requirePermission("BULK_PRICE_UPDATE");
  const products = await resolveTargets(ctx.business.id, params);
  const rows = computeRows(products, params);
  return { rows, totalAffected: rows.length };
}

/**
 * Applies the update inside one transaction. Prices are recomputed
 * server-side from current values — the client preview is display only.
 */
export async function applyBulkPriceUpdate(params: BulkPriceParams) {
  const ctx = await requirePermission("BULK_PRICE_UPDATE");
  const products = await resolveTargets(ctx.business.id, params);
  const rows = computeRows(products, params);
  if (rows.length === 0) throw new Error("NO_PRODUCTS");

  const field = priceField(params.priceType);
  const brand = params.brandId
    ? await db.brand.findFirst({ where: { id: params.brandId, businessId: ctx.business.id } })
    : null;

  await db.$transaction(async (tx) => {
    for (const row of rows) {
      if (row.oldPrice === row.newPrice) continue;
      await tx.product.update({
        where: { id: row.productId },
        data: { [field]: row.newPrice },
      });
      await tx.priceHistory.create({
        data: {
          businessId: ctx.business.id,
          productId: row.productId,
          priceType: params.priceType,
          oldPrice: row.oldPrice,
          newPrice: row.newPrice,
          source: params.brandId ? "BRAND_BULK" : "BULK_SELECT",
          changedById: ctx.user.id,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "BULK_PRICE_UPDATE",
        entityType: params.brandId ? "Brand" : "Product",
        entityId: params.brandId ?? null,
        metadata: {
          brand: brand?.name ?? null,
          priceType: params.priceType,
          direction: params.direction,
          percent: params.percent,
          rounding: params.rounding,
          affectedProducts: rows.length,
        },
      },
    });
  });

  return { updated: rows.length };
}
