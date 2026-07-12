"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { receivePayment } from "@/server/services/payments";
import { setOpeningBalance, adjustBalance } from "@/server/services/ledger";
import { cancelBill } from "@/server/services/bills";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

const decimalStr = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Sahi number darj karein");

export async function receivePaymentAction(
  customerId: string,
  raw: unknown
): Promise<ActionResult<{ receiptNumber: string; newBalance: string }>> {
  const schema = z.object({
    amount: decimalStr,
    method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Amount sahi nahi hai." };

  try {
    const result = await receivePayment({ customerId, ...parsed.data });
    revalidatePath(`/khata/${customerId}`);
    revalidatePath("/khata");
    return { ok: true, error: null, data: { receiptNumber: result.receiptNumber, newBalance: result.newBalance } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "CUSTOMER_NOT_FOUND") return { ok: false, error: "Customer nahi mila." };
    if (msg === "INVALID_AMOUNT") return { ok: false, error: "Amount sahi nahi hai." };
    return { ok: false, error: "Payment record nahi ho saki." };
  }
}

export async function setOpeningBalanceAction(customerId: string, amount: string): Promise<ActionResult> {
  const parsed = decimalStr.safeParse(amount);
  if (!parsed.success) return { ok: false, error: "Amount sahi nahi hai." };

  try {
    await setOpeningBalance(customerId, parsed.data);
    revalidatePath(`/khata/${customerId}`);
    revalidatePath("/khata");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Opening balance set nahi ho saka." };
  }
}

export async function adjustBalanceAction(
  customerId: string,
  type: "POSITIVE_ADJUSTMENT" | "NEGATIVE_ADJUSTMENT",
  amount: string,
  note: string
): Promise<ActionResult> {
  const parsed = decimalStr.safeParse(amount);
  if (!parsed.success) return { ok: false, error: "Amount sahi nahi hai." };

  try {
    await adjustBalance(customerId, type, parsed.data, note);
    revalidatePath(`/khata/${customerId}`);
    revalidatePath("/khata");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Adjustment nahi ho saki." };
  }
}

export async function cancelBillAction(saleId: string, reason: string, customerId?: string | null): Promise<ActionResult> {
  try {
    await cancelBill(saleId, reason);
    revalidatePath("/bills");
    if (customerId) revalidatePath(`/khata/${customerId}`);
    return { ok: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "ALREADY_CANCELLED") return { ok: false, error: "Yeh bill pehle se cancel ho chuka hai." };
    if (msg === "BILL_NOT_FOUND") return { ok: false, error: "Bill nahi mila." };
    return { ok: false, error: "Bill cancel nahi ho saka." };
  }
}
