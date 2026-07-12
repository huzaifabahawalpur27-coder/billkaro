"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createBrand,
  renameBrand,
  deleteBrand,
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/server/services/catalogue";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const nameSchema = z.string().trim().min(1, "Naam enter karein.").max(100);

export async function addBrandAction(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createBrand(parsed.data);
  } catch {
    return { ok: false, error: "Brand create nahi ho saka." };
  }
  revalidatePath("/brands");
  return { ok: true, error: null };
}

export async function renameBrandAction(id: string, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await renameBrand(id, parsed.data);
  } catch {
    return { ok: false, error: "Brand rename nahi ho saka. Shayad yeh naam pehle se mojood hai." };
  }
  revalidatePath("/brands");
  return { ok: true, error: null };
}

export async function deleteBrandAction(id: string): Promise<ActionResult> {
  try {
    await deleteBrand(id);
  } catch (e) {
    if (e instanceof Error && e.message === "BRAND_IN_USE") {
      return {
        ok: false,
        error: "Is brand ke products mojood hain — pehle products ka brand tabdeel karein.",
      };
    }
    return { ok: false, error: "Brand delete nahi ho saka." };
  }
  revalidatePath("/brands");
  return { ok: true, error: null };
}

export async function addCategoryAction(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await createCategory(parsed.data);
  } catch {
    return { ok: false, error: "Category create nahi ho saki." };
  }
  revalidatePath("/categories");
  return { ok: true, error: null };
}

export async function renameCategoryAction(id: string, name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await renameCategory(id, parsed.data);
  } catch {
    return { ok: false, error: "Category rename nahi ho saki." };
  }
  revalidatePath("/categories");
  return { ok: true, error: null };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await deleteCategory(id);
  } catch (e) {
    if (e instanceof Error && e.message === "CATEGORY_IN_USE") {
      return {
        ok: false,
        error: "Is category ke products mojood hain — pehle products ki category tabdeel karein.",
      };
    }
    return { ok: false, error: "Category delete nahi ho saki." };
  }
  revalidatePath("/categories");
  return { ok: true, error: null };
}
