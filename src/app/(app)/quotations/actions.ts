"use server";

import { revalidatePath } from "next/cache";
import { cancelQuotation, QuotationError } from "@/server/services/quotations";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

export async function cancelQuotationAction(quotationId: string): Promise<ActionResult> {
  try {
    await cancelQuotation(quotationId);
    revalidatePath("/quotations");
    revalidatePath(`/quotations/${quotationId}`);
    return { ok: true, error: null };
  } catch (e) {
    if (e instanceof QuotationError && e.code === "NOT_ACTIVE") {
      return { ok: false, error: "Sirf active quotation cancel ho sakti hai." };
    }
    return { ok: false, error: "Quotation cancel nahi ho saki." };
  }
}
