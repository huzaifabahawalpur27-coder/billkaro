"use server";

import { markAnnouncementsSeen } from "@/server/services/announcements";

export async function markAnnouncementsSeenAction(ids: string[]): Promise<void> {
  try {
    await markAnnouncementsSeen(Array.isArray(ids) ? ids.filter((i) => typeof i === "string") : []);
  } catch {
    // Seen-marking is best-effort; never surface an error for it.
  }
}
