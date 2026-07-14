"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { createSession } from "@/server/auth/session";
import { isSaasMode } from "@/lib/platform";
import {
  updateTenant,
  suspendTenant,
  activateTenant,
} from "@/server/services/platform/tenants";
import {
  assignSubscription,
  recordPlatformPayment,
  extendSubscription,
} from "@/server/services/platform/subscriptions";
import { logPlatformAction } from "@/server/services/platform/audit";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const FAIL: ActionResult = { ok: false, error: "Action fail ho gaya. Dubara try karein." };

function revalidateTenant(businessId: string) {
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${businessId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
}

const tenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function updateTenantAction(businessId: string, raw: unknown): Promise<ActionResult> {
  const parsed = tenantSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Tenant details sahi nahi hain." };
  try {
    await updateTenant(businessId, parsed.data);
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch {
    return FAIL;
  }
}

export async function suspendTenantAction(businessId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, error: "Suspension ki wajah zaroori hai." };
  try {
    await suspendTenant(businessId, reason);
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch {
    return FAIL;
  }
}

export async function activateTenantAction(businessId: string): Promise<ActionResult> {
  try {
    await activateTenant(businessId);
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch {
    return FAIL;
  }
}

export async function assignPlanAction(
  businessId: string,
  planId: string,
  trialDays?: number
): Promise<ActionResult> {
  try {
    await assignSubscription(businessId, planId, trialDays);
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch {
    return FAIL;
  }
}

const paymentSchema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  method: z.enum(["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "OTHER"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  cycles: z.coerce.number().int().min(1).max(24).default(1),
});

export async function recordPaymentAction(businessId: string, raw: unknown): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Payment ki details sahi nahi hain." };
  try {
    await recordPlatformPayment({ businessId, ...parsed.data });
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch (e) {
    if (e instanceof Error && e.message === "NO_SUBSCRIPTION") {
      return { ok: false, error: "Pehle tenant ko plan assign karein." };
    }
    return FAIL;
  }
}

export async function extendSubscriptionAction(
  businessId: string,
  days: number,
  reason: string
): Promise<ActionResult> {
  try {
    await extendSubscription(businessId, days, reason);
    revalidateTenant(businessId);
    return { ok: true, error: null };
  } catch (e) {
    if (e instanceof Error && e.message === "NO_SUBSCRIPTION") {
      return { ok: false, error: "Pehle tenant ko plan assign karein." };
    }
    if (e instanceof Error && e.message === "REASON_REQUIRED") {
      return { ok: false, error: "Extension ki wajah zaroori hai." };
    }
    return FAIL;
  }
}

/**
 * Enter a tenant as platform admin: rewrite the session cookie with a
 * short-lived impersonation session, then land on the tenant dashboard.
 * Nothing sensitive travels via URL.
 */
export async function impersonateTenantAction(businessId: string): Promise<ActionResult> {
  if (!isSaasMode()) return FAIL;
  const { user } = await requirePlatformAdmin();

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true },
  });
  if (!business) return { ok: false, error: "Tenant nahi mila." };

  await logPlatformAction(db, {
    actorId: user.id,
    action: "IMPERSONATION_STARTED",
    targetBusinessId: businessId,
    metadata: { business: business.name },
  });
  await createSession(
    { userId: user.id, businessId, impersonatorId: user.id },
    60 * 60 // 1 hour
  );
  redirect("/dashboard");
}
