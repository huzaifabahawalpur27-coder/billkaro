import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { EntityStatus, PriceChangeSource, PriceType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission, requireBusiness } from "@/server/auth/guards";
import { D } from "@/lib/money";

// ─────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string;
  brandId?: string;
  categoryId?: string;
  status?: EntityStatus;
  page?: number;
  pageSize?: number;
}

export async function listProducts(filters: ProductFilters) {
  const ctx = await requirePermission("VIEW_PRODUCTS");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.ProductWhereInput = {
    businessId: ctx.business.id,
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
            { barcode: filters.search },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return { products, total, page, pageSize };
}

export interface ProductInput {
  name: string;
  salePrice: string;
  sku?: string | null;
  barcode?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  purchasePrice?: string | null;
  wholesalePrice?: string | null;
  status?: EntityStatus;
}

async function assertOwnedRefs(
  businessId: string,
  input: Pick<ProductInput, "brandId" | "categoryId" | "unitId">
) {
  if (input.brandId) {
    const brand = await db.brand.findFirst({ where: { id: input.brandId, businessId } });
    if (!brand) throw new Error("Brand not found");
  }
  if (input.categoryId) {
    const cat = await db.category.findFirst({ where: { id: input.categoryId, businessId } });
    if (!cat) throw new Error("Category not found");
  }
  if (input.unitId) {
    const unit = await db.unit.findFirst({ where: { id: input.unitId, businessId } });
    if (!unit) throw new Error("Unit not found");
  }
}

export async function createProduct(input: ProductInput) {
  const ctx = await requirePermission("ADD_PRODUCTS");
  await assertOwnedRefs(ctx.business.id, input);

  return db.product.create({
    data: {
      businessId: ctx.business.id,
      name: input.name,
      salePrice: input.salePrice,
      sku: input.sku || null,
      barcode: input.barcode || null,
      brandId: input.brandId || null,
      categoryId: input.categoryId || null,
      unitId: input.unitId || null,
      purchasePrice: input.purchasePrice || null,
      wholesalePrice: input.wholesalePrice || null,
      status: input.status ?? "ACTIVE",
    },
  });
}

export async function updateProduct(productId: string, input: ProductInput) {
  const ctx = await requirePermission("EDIT_PRODUCTS");
  const existing = await db.product.findFirst({
    where: { id: productId, businessId: ctx.business.id },
  });
  if (!existing) throw new Error("Product not found");
  await assertOwnedRefs(ctx.business.id, input);

  const priceChanges: { priceType: PriceType; oldPrice: string | null; newPrice: string }[] = [];
  const checkPrice = (
    priceType: PriceType,
    oldVal: unknown,
    newVal: string | null | undefined
  ) => {
    if (newVal == null || newVal === "") return;
    const oldD = oldVal == null ? null : D(oldVal as string);
    if (oldD === null || !oldD.eq(D(newVal))) {
      priceChanges.push({
        priceType,
        oldPrice: oldD ? oldD.toFixed(2) : null,
        newPrice: D(newVal).toFixed(2),
      });
    }
  };
  checkPrice("SALE", existing.salePrice, input.salePrice);
  checkPrice("PURCHASE", existing.purchasePrice, input.purchasePrice);
  checkPrice("WHOLESALE", existing.wholesalePrice, input.wholesalePrice);

  return db.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        salePrice: input.salePrice,
        sku: input.sku || null,
        barcode: input.barcode || null,
        brandId: input.brandId || null,
        categoryId: input.categoryId || null,
        unitId: input.unitId || null,
        purchasePrice: input.purchasePrice || null,
        wholesalePrice: input.wholesalePrice || null,
        status: input.status ?? existing.status,
      },
    });
    if (priceChanges.length) {
      await tx.priceHistory.createMany({
        data: priceChanges.map((c) => ({
          businessId: ctx.business.id,
          productId: existing.id,
          priceType: c.priceType,
          oldPrice: c.oldPrice,
          newPrice: c.newPrice,
          source: "MANUAL" as PriceChangeSource,
          changedById: ctx.user.id,
        })),
      });
    }
    return product;
  });
}

/** Inline sale-price edit from the products table. */
export async function updateSalePrice(productId: string, newPrice: string) {
  const ctx = await requirePermission("CHANGE_PRICES");
  const existing = await db.product.findFirst({
    where: { id: productId, businessId: ctx.business.id },
  });
  if (!existing) throw new Error("Product not found");

  const oldPrice = D(existing.salePrice);
  const nextPrice = D(newPrice);
  if (nextPrice.lte(0)) throw new Error("INVALID_PRICE");
  if (oldPrice.eq(nextPrice)) return existing;

  const [product] = await db.$transaction([
    db.product.update({
      where: { id: existing.id },
      data: { salePrice: nextPrice.toFixed(2) },
    }),
    db.priceHistory.create({
      data: {
        businessId: ctx.business.id,
        productId: existing.id,
        priceType: "SALE",
        oldPrice: oldPrice.toFixed(2),
        newPrice: nextPrice.toFixed(2),
        source: "INLINE_EDIT",
        changedById: ctx.user.id,
      },
    }),
  ]);
  return product;
}

export async function deleteProduct(productId: string) {
  const ctx = await requirePermission("DELETE_PRODUCTS");
  const existing = await db.product.findFirst({
    where: { id: productId, businessId: ctx.business.id },
  });
  if (!existing) throw new Error("Product not found");

  await db.$transaction(async (tx) => {
    await tx.product.delete({ where: { id: existing.id } });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: existing.id,
        metadata: { name: existing.name, sku: existing.sku },
      },
    });
  });
}

export async function getPriceHistory(productId: string) {
  const ctx = await requirePermission("VIEW_PRODUCTS");
  const product = await db.product.findFirst({
    where: { id: productId, businessId: ctx.business.id },
    select: { id: true, name: true },
  });
  if (!product) throw new Error("Product not found");

  const history = await db.priceHistory.findMany({
    where: { businessId: ctx.business.id, productId },
    include: { changedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { product, history };
}

// ─────────────────────────────────────────────────────────────
// Brands / Categories / Units
// ─────────────────────────────────────────────────────────────

export async function listBrandOptions() {
  const ctx = await requireBusiness();
  return db.brand.findMany({
    where: { businessId: ctx.business.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listCategoryOptions() {
  const ctx = await requireBusiness();
  return db.category.findMany({
    where: { businessId: ctx.business.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listUnitOptions() {
  const ctx = await requireBusiness();
  return db.unit.findMany({
    where: { businessId: ctx.business.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Inline creation from the product form. Returns existing on name match. */
export async function createBrand(name: string) {
  const ctx = await requirePermission("ADD_PRODUCTS");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  const existing = await db.brand.findFirst({
    where: { businessId: ctx.business.id, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return db.brand.create({ data: { businessId: ctx.business.id, name: trimmed } });
}

export async function createCategory(name: string) {
  const ctx = await requirePermission("ADD_PRODUCTS");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  const existing = await db.category.findFirst({
    where: { businessId: ctx.business.id, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return db.category.create({ data: { businessId: ctx.business.id, name: trimmed } });
}

export async function createUnit(name: string) {
  const ctx = await requirePermission("ADD_PRODUCTS");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  const existing = await db.unit.findFirst({
    where: { businessId: ctx.business.id, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;
  return db.unit.create({ data: { businessId: ctx.business.id, name: trimmed } });
}

export async function listBrandsWithStats() {
  const ctx = await requireBusiness();
  const brands = await db.brand.findMany({
    where: { businessId: ctx.business.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  // Last price update per brand (single grouped query)
  const lastUpdates = await db.priceHistory.groupBy({
    by: ["productId"],
    where: { businessId: ctx.business.id },
    _max: { createdAt: true },
  });
  const productBrands = await db.product.findMany({
    where: {
      businessId: ctx.business.id,
      id: { in: lastUpdates.map((u) => u.productId) },
      brandId: { not: null },
    },
    select: { id: true, brandId: true },
  });
  const brandLastUpdate = new Map<string, Date>();
  for (const u of lastUpdates) {
    const brandId = productBrands.find((p) => p.id === u.productId)?.brandId;
    if (!brandId || !u._max.createdAt) continue;
    const current = brandLastUpdate.get(brandId);
    if (!current || u._max.createdAt > current) brandLastUpdate.set(brandId, u._max.createdAt);
  }
  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    status: b.status,
    productCount: b._count.products,
    lastPriceUpdate: brandLastUpdate.get(b.id) ?? null,
  }));
}

export async function listCategoriesWithStats() {
  const ctx = await requireBusiness();
  const categories = await db.category.findMany({
    where: { businessId: ctx.business.id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    productCount: c._count.products,
  }));
}

export async function renameBrand(id: string, name: string) {
  const ctx = await requirePermission("EDIT_PRODUCTS");
  const brand = await db.brand.findFirst({ where: { id, businessId: ctx.business.id } });
  if (!brand) throw new Error("Brand not found");
  return db.brand.update({ where: { id: brand.id }, data: { name: name.trim() } });
}

export async function deleteBrand(id: string) {
  const ctx = await requirePermission("DELETE_PRODUCTS");
  const brand = await db.brand.findFirst({
    where: { id, businessId: ctx.business.id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new Error("Brand not found");
  if (brand._count.products > 0) throw new Error("BRAND_IN_USE");
  await db.brand.delete({ where: { id: brand.id } });
}

export async function renameCategory(id: string, name: string) {
  const ctx = await requirePermission("EDIT_PRODUCTS");
  const category = await db.category.findFirst({ where: { id, businessId: ctx.business.id } });
  if (!category) throw new Error("Category not found");
  return db.category.update({ where: { id: category.id }, data: { name: name.trim() } });
}

export async function deleteCategory(id: string) {
  const ctx = await requirePermission("DELETE_PRODUCTS");
  const category = await db.category.findFirst({
    where: { id, businessId: ctx.business.id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) throw new Error("Category not found");
  if (category._count.products > 0) throw new Error("CATEGORY_IN_USE");
  await db.category.delete({ where: { id: category.id } });
}

export async function renameUnit(id: string, name: string) {
  const ctx = await requirePermission("EDIT_PRODUCTS");
  const unit = await db.unit.findFirst({ where: { id, businessId: ctx.business.id } });
  if (!unit) throw new Error("Unit not found");
  return db.unit.update({ where: { id: unit.id }, data: { name: name.trim() } });
}

export async function deleteUnit(id: string) {
  const ctx = await requirePermission("DELETE_PRODUCTS");
  const unit = await db.unit.findFirst({
    where: { id, businessId: ctx.business.id },
    include: { _count: { select: { products: true } } },
  });
  if (!unit) throw new Error("Unit not found");
  if (unit._count.products > 0) throw new Error("UNIT_IN_USE");
  await db.unit.delete({ where: { id: unit.id } });
}
