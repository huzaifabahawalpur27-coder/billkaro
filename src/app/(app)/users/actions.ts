"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createMember, updateMemberRole, setMemberStatus } from "@/server/services/users";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const addUserSchema = z.object({
  name: z.string().trim().min(2, "Naam enter karein."),
  email: z.string().trim().toLowerCase().email("Sahi email enter karein."),
  password: z.string().min(6, "Password kam az kam 6 characters ka ho."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  roleId: z.string().min(1, "Role select karein."),
});

export async function addUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = addUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await createMember({ ...parsed.data, phone: parsed.data.phone || undefined });
  } catch (e) {
    if (e instanceof Error && e.message === "MEMBER_EXISTS") {
      return { ok: false, error: "Yeh user pehle se is business mein shamil hai." };
    }
    return { ok: false, error: "User add nahi ho saka. Dubara try karein." };
  }
  revalidatePath("/users");
  return { ok: true, error: null };
}

export async function changeRoleAction(memberId: string, roleId: string): Promise<ActionResult> {
  try {
    await updateMemberRole(memberId, roleId);
  } catch (e) {
    if (e instanceof Error && e.message === "CANNOT_EDIT_SELF") {
      return { ok: false, error: "Aap apna role khud tabdeel nahi kar sakte." };
    }
    return { ok: false, error: "Role tabdeel nahi ho saka." };
  }
  revalidatePath("/users");
  return { ok: true, error: null };
}

export async function toggleUserAction(memberId: string, active: boolean): Promise<ActionResult> {
  try {
    await setMemberStatus(memberId, active);
  } catch (e) {
    if (e instanceof Error && e.message === "CANNOT_EDIT_SELF") {
      return { ok: false, error: "Aap apna account khud disable nahi kar sakte." };
    }
    return { ok: false, error: "Status tabdeel nahi ho saka." };
  }
  revalidatePath("/users");
  return { ok: true, error: null };
}
