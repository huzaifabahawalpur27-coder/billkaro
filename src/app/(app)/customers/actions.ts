"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCustomer,
  updateCustomer,
  setCustomerStatus,
  type CustomerInput,
} from "@/server/services/customers";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  creditLimit: z.string().trim().nullable().optional(),
});

export async function createCustomerAction(raw: unknown): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Darj maloomat galat hai." };
  try {
    await createCustomer(parsed.data as CustomerInput);
    revalidatePath("/customers");
    return { ok: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NAME_REQUIRED") return { ok: false, error: "Naam zaroori hai." };
    return { ok: false, error: "Customer add nahi ho saka." };
  }
}

export async function updateCustomerAction(customerId: string, raw: unknown): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Darj maloomat galat hai." };
  try {
    await updateCustomer(customerId, parsed.data as CustomerInput);
    revalidatePath("/customers");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Customer update nahi ho saka." };
  }
}

export async function setCustomerStatusAction(customerId: string, active: boolean): Promise<ActionResult> {
  try {
    await setCustomerStatus(customerId, active);
    revalidatePath("/customers");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Status update nahi ho saka." };
  }
}
