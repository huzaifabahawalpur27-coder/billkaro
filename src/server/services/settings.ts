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

export interface BusinessProfileInput {
  name: string;
  ownerName: string;
  phone?: string | null;
  address?: string | null;
  businessType?: string | null;
  logoUrl?: string | null;
}

/** Shop details shown on every receipt — name/owner live on Business, logo on BusinessSettings. */
export async function updateBusinessProfile(input: BusinessProfileInput) {
  const ctx = await requirePermission("MANAGE_SETTINGS");

  const name = input.name.trim();
  const ownerName = input.ownerName.trim();
  if (!name || !ownerName) throw new Error("NAME_REQUIRED");

  await db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: ctx.business.id },
      data: {
        name,
        ownerName,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        businessType: input.businessType?.trim() || null,
      },
    });
    await tx.businessSettings.update({
      where: { businessId: ctx.business.id },
      data: { logoUrl: input.logoUrl?.trim() || null },
    });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "BUSINESS_PROFILE_UPDATED",
        entityType: "Business",
        entityId: ctx.business.id,
        metadata: { name },
      },
    });
  });
}

export async function getSettings() {
  const ctx = await requirePermission("MANAGE_SETTINGS", { read: true });
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
