"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateSettings, updateBusinessProfile } from "@/server/services/settings";

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

const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Shop ka naam kam az kam 2 harf ka ho.").max(120),
  ownerName: z.string().trim().min(2, "Owner ka naam kam az kam 2 harf ka ho.").max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  businessType: z.string().trim().max(60).optional().or(z.literal("")),
  logoUrl: z.url("Logo ka sahi URL enter karein.").max(500).optional().or(z.literal("")),
});

export async function updateBusinessProfileAction(raw: unknown): Promise<ActionResult> {
  const parsed = businessProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await updateBusinessProfile(parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Shop details save nahi ho sake." };
  }
}

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
