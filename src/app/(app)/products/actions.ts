"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProduct,
  updateProduct,
  updateSalePrice,
  deleteProduct,
  createBrand,
  createCategory,
  createUnit,
  getPriceHistory,
} from "@/server/services/catalogue";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

const decimalStr = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Sahi price enter karein (e.g. 580 ya 580.50).");

const productSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Product ka naam zaroori hai."),
  salePrice: decimalStr,
  sku: z.string().trim().max(64).optional().or(z.literal("")),
  barcode: z.string().trim().max(64).optional().or(z.literal("")),
  brandId: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  unitId: z.string().optional().or(z.literal("")),
  purchasePrice: decimalStr.optional().or(z.literal("")),
  wholesalePrice: decimalStr.optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

export async function saveProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...input } = parsed.data;

  try {
    if (id) {
      await updateProduct(id, input);
    } else {
      await createProduct(input);
    }
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: "Is SKU ya barcode ka product pehle se mojood hai." };
    }
    return { ok: false, error: "Product save nahi ho saka. Dubara try karein." };
  }
  revalidatePath("/products");
  return { ok: true, error: null };
}

export async function inlinePriceAction(productId: string, price: string): Promise<ActionResult> {
  const parsed = decimalStr.safeParse(price.trim());
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updateSalePrice(productId, parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_PRICE") {
      return { ok: false, error: "Price Rs. 0 se zyada honi chahiye." };
    }
    return { ok: false, error: "Price update nahi ho saki." };
  }
  revalidatePath("/products");
  return { ok: true, error: null };
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  try {
    await deleteProduct(productId);
  } catch {
    return { ok: false, error: "Product delete nahi ho saka." };
  }
  revalidatePath("/products");
  return { ok: true, error: null };
}

export async function createBrandAction(
  name: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const brand = await createBrand(name);
    revalidatePath("/products");
    revalidatePath("/brands");
    return { ok: true, error: null, data: { id: brand.id, name: brand.name } };
  } catch {
    return { ok: false, error: "Brand create nahi ho saka." };
  }
}

export async function createCategoryAction(
  name: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const category = await createCategory(name);
    revalidatePath("/products");
    revalidatePath("/categories");
    return { ok: true, error: null, data: { id: category.id, name: category.name } };
  } catch {
    return { ok: false, error: "Category create nahi ho saki." };
  }
}

export async function createUnitAction(
  name: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const unit = await createUnit(name);
    revalidatePath("/products");
    return { ok: true, error: null, data: { id: unit.id, name: unit.name } };
  } catch {
    return { ok: false, error: "Unit create nahi ho saka." };
  }
}

export interface PriceHistoryRow {
  id: string;
  priceType: string;
  oldPrice: string | null;
  newPrice: string;
  source: string;
  changedBy: string;
  createdAt: string;
}

export async function priceHistoryAction(
  productId: string
): Promise<ActionResult<{ productName: string; rows: PriceHistoryRow[] }>> {
  try {
    const { product, history } = await getPriceHistory(productId);
    return {
      ok: true,
      error: null,
      data: {
        productName: product.name,
        rows: history.map((h) => ({
          id: h.id,
          priceType: h.priceType,
          oldPrice: h.oldPrice ? h.oldPrice.toString() : null,
          newPrice: h.newPrice.toString(),
          source: h.source,
          changedBy: h.changedBy.name,
          createdAt: h.createdAt.toISOString(),
        })),
      },
    };
  } catch {
    return { ok: false, error: "Price history load nahi ho saki." };
  }
}
