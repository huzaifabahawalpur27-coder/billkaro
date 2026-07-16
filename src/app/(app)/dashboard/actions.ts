"use server";

import { getSalesSummaryForDates } from "@/server/services/reports";

export async function fetchCustomSummaryAction(fromStr: string, toStr: string) {
  try {
    const data = await getSalesSummaryForDates(fromStr, toStr);
    return { ok: true, data, error: null };
  } catch (err: any) {
    return { ok: false, data: null, error: err.message || "Failed to fetch summary" };
  }
}
