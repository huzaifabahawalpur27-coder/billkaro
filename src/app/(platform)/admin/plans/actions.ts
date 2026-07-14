"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createPlan, updatePlan } from "@/server/services/platform/plans";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Sahi price enter karein."),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "LIFETIME"]),
  maxUsers: z.coerce.number().int().min(1).nullable().optional(),
  maxProducts: z.coerce.number().int().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
});

export async function savePlanAction(planId: string | null, raw: unknown): Promise<ActionResult> {
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Plan ki details sahi nahi hain." };

  try {
    if (planId) await updatePlan(planId, parsed.data);
    else await createPlan(parsed.data);
    revalidatePath("/admin/plans");
    revalidatePath("/admin");
    return { ok: true, error: null };
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: "Is naam ka plan pehle se mojood hai." };
    }
    return { ok: false, error: "Plan save nahi ho saka." };
  }
}
