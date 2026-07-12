import "server-only";
import type { ReceiptSize, RoundingRule } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";

export interface SettingsInput {
  currencyCode?: string;
  currencySymbol?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  defaultTaxRate?: string;
  receiptSize?: ReceiptSize;
  priceRounding?: RoundingRule;
  invoiceFooter?: string;
  language?: string;
}

export async function getSettings() {
  const ctx = await requirePermission("MANAGE_SETTINGS");
  const settings = await db.businessSettings.findUnique({
    where: { businessId: ctx.business.id },
  });
  if (!settings) throw new Error("Settings not found");
  return { settings, business: ctx.business };
}

export async function updateSettings(input: SettingsInput) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const updated = await db.businessSettings.update({
    where: { businessId: ctx.business.id },
    data: {
      ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode.trim() } : {}),
      ...(input.currencySymbol !== undefined ? { currencySymbol: input.currencySymbol.trim() } : {}),
      ...(input.invoicePrefix !== undefined ? { invoicePrefix: input.invoicePrefix.trim().toUpperCase() } : {}),
      ...(input.receiptPrefix !== undefined ? { receiptPrefix: input.receiptPrefix.trim().toUpperCase() } : {}),
      ...(input.defaultTaxRate !== undefined ? { defaultTaxRate: input.defaultTaxRate } : {}),
      ...(input.receiptSize !== undefined ? { receiptSize: input.receiptSize } : {}),
      ...(input.priceRounding !== undefined ? { priceRounding: input.priceRounding } : {}),
      ...(input.invoiceFooter !== undefined ? { invoiceFooter: input.invoiceFooter.trim() } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      businessId: ctx.business.id,
      userId: ctx.user.id,
      action: "SETTINGS_UPDATED",
      entityType: "BusinessSettings",
      entityId: updated.id,
    },
  });

  return updated;
}
