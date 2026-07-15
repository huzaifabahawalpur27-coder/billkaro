"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createAnnouncement,
  setAnnouncementActive,
} from "@/server/services/platform/announcements";

export interface ActionResult {
  ok: boolean;
  error: string | null;
}

const announcementSchema = z.object({
  title: z.string().trim().min(3, "Title kam az kam 3 harf.").max(120),
  body: z.string().trim().min(3, "Message likhein.").max(1000),
  type: z.enum(["INFO", "WARNING", "URGENT"]),
  targetBusinessId: z.string().optional().or(z.literal("")),
  expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
});

export async function createAnnouncementAction(raw: unknown): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await createAnnouncement({
      ...parsed.data,
      targetBusinessId: parsed.data.targetBusinessId || null,
      expiresInDays: parsed.data.expiresInDays ?? null,
    });
    revalidatePath("/admin/announcements");
    return { ok: true, error: null };
  } catch (e) {
    if (e instanceof Error && e.message === "TENANT_NOT_FOUND") {
      return { ok: false, error: "Target tenant nahi mila." };
    }
    return { ok: false, error: "Announcement create nahi ho saka." };
  }
}

export async function setAnnouncementActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await setAnnouncementActive(id, active);
    revalidatePath("/admin/announcements");
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Update fail ho gaya." };
  }
}
