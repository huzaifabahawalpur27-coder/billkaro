"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCashBookEntry, deleteCashBookEntry } from "@/server/services/cashbook";

const cashBookSchema = z.object({
  amount: z.string().trim().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Raqam sahi enter karein (0 se bari ho).",
  }),
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  description: z.string().trim().min(2, "Kam az kam 2 harf enter karein."),
});

export async function createCashBookEntryAction(raw: unknown) {
  const parsed = cashBookSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await createCashBookEntry(parsed.data);
    revalidatePath("/cashbook");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Entry add nahi ho saki." };
  }
}

export async function deleteCashBookEntryAction(id: string) {
  try {
    await deleteCashBookEntry(id);
    revalidatePath("/cashbook");
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || "Entry delete nahi ho saki." };
  }
}
