"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createUnit,
  renameUnit,
  deleteUnit,
  setUnitFractional,
} from "@/server/services/catalogue";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const nameSchema = z.string().trim().min(1, "Naam enter karein.").max(100);

export async function addUnitAction(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createUnit(parsed.data);
  } catch {
    return { ok: false, error: "Unit add nahi ho saka." };
  }
  revalidatePath("/units");
  revalidatePath("/products");
  return { ok: true, error: null };
}

export async function renameUnitAction(id: string, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await renameUnit(id, parsed.data);
  } catch {
    return { ok: false, error: "Rename nahi ho saka." };
  }
  revalidatePath("/units");
  return { ok: true, error: null };
}

export async function setUnitFractionalAction(
  id: string,
  isFractional: boolean
): Promise<ActionResult> {
  try {
    await setUnitFractional(id, isFractional);
  } catch {
    return { ok: false, error: "Update nahi ho saka." };
  }
  revalidatePath("/units");
  revalidatePath("/bill");
  return { ok: true, error: null };
}

export async function deleteUnitAction(id: string): Promise<ActionResult> {
  try {
    await deleteUnit(id);
  } catch (e) {
    if (e instanceof Error && e.message === "UNIT_IN_USE") {
      return { ok: false, error: "Yeh unit products mein use ho raha hai — pehle products update karein." };
    }
    return { ok: false, error: "Delete nahi ho saka." };
  }
  revalidatePath("/units");
  revalidatePath("/products");
  return { ok: true, error: null };
}
