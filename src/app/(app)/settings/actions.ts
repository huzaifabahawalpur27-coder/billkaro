"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateSettings } from "@/server/services/settings";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const settingsSchema = z.object({
  currencyCode: z.string().trim().max(10).optional(),
  currencySymbol: z.string().trim().max(10).optional(),
  invoicePrefix: z.string().trim().max(20).optional(),
  receiptPrefix: z.string().trim().max(20).optional(),
  defaultTaxRate: z.string().trim().optional(),
  receiptSize: z.enum(["THERMAL_58", "THERMAL_80", "A4"]).optional(),
  priceRounding: z.enum(["NONE", "NEAREST_1", "NEAREST_5", "NEAREST_10"]).optional(),
  invoiceFooter: z.string().trim().max(500).optional(),
  language: z.string().trim().max(10).optional(),
});

export async function updateSettingsAction(raw: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Settings galat hain." };

  try {
    await updateSettings(parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Settings save nahi ho sake." };
  }
}
