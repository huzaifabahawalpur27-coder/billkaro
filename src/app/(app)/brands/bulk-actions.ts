"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  previewBulkPriceUpdate,
  applyBulkPriceUpdate,
  type BulkPreviewRow,
} from "@/server/services/pricing";

export interface BulkActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

const bulkSchema = z
  .object({
    brandId: z.string().optional(),
    productIds: z.array(z.string()).max(1000).optional(),
    priceType: z.enum(["SALE", "PURCHASE", "WHOLESALE"]),
    direction: z.enum(["INCREASE", "DECREASE"]),
    percent: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Sahi percentage enter karein (e.g. 10)."),
    rounding: z.enum(["NONE", "NEAREST_1", "NEAREST_5", "NEAREST_10"]),
  })
  .refine((v) => v.brandId || (v.productIds && v.productIds.length > 0), {
    message: "Brand ya products select karein.",
  });

export type BulkPriceInput = z.infer<typeof bulkSchema>;

export interface BulkPreviewData {
  rows: BulkPreviewRow[];
  totalAffected: number;
}

function friendlyError(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === "INVALID_PERCENT") return "Percentage 0 se zyada aur 500 tak honi chahiye.";
    if (e.message === "NO_PRODUCTS") return "Koi product update ke liye nahi mila.";
    if (e.message === "NO_TARGET") return "Brand ya products select karein.";
  }
  return "Price update fail ho gaya. Koi price tabdeel nahi hui.";
}

export async function previewBulkPriceAction(
  input: BulkPriceInput
): Promise<BulkActionResult<BulkPreviewData>> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const data = await previewBulkPriceUpdate(parsed.data);
    if (data.totalAffected === 0) {
      return { ok: false, error: "Is selection mein koi active product nahi mila." };
    }
    return { ok: true, error: null, data };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function applyBulkPriceAction(
  input: BulkPriceInput
): Promise<BulkActionResult<{ updated: number }>> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    const data = await applyBulkPriceUpdate(parsed.data);
    revalidatePath("/products");
    revalidatePath("/brands");
    return { ok: true, error: null, data };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}
