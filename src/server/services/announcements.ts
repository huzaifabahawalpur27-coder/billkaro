import "server-only";
import { db } from "@/server/db";
import { requireBusiness } from "@/server/auth/guards";
import { isSaasMode } from "@/lib/platform";

export interface MyAnnouncement {
  id: string;
  title: string;
  body: string;
  type: "INFO" | "WARNING" | "URGENT";
  createdAt: string;
  seen: boolean;
}

/**
 * Announcements visible to the current user: platform broadcasts plus ones
 * targeted at their business. No permission gate — every role sees them.
 * Standalone installs have no platform, so this is a no-op there.
 */
export async function getMyAnnouncements(): Promise<MyAnnouncement[]> {
  if (!isSaasMode()) return [];
  const ctx = await requireBusiness();

  const announcements = await db.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ targetBusinessId: null }, { targetBusinessId: ctx.business.id }],
      AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
    },
    include: {
      seenBy: { where: { userId: ctx.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    type: a.type,
    createdAt: a.createdAt.toISOString(),
    seen: a.seenBy.length > 0,
  }));
}

export async function markAnnouncementsSeen(ids: string[]) {
  if (!isSaasMode() || ids.length === 0) return;
  const ctx = await requireBusiness();

  // Only ids actually visible to this user — guards the FK and scoping.
  const visible = await db.announcement.findMany({
    where: {
      id: { in: ids.slice(0, 20) },
      OR: [{ targetBusinessId: null }, { targetBusinessId: ctx.business.id }],
    },
    select: { id: true },
  });

  await db.announcementSeen.createMany({
    data: visible.map((a) => ({ announcementId: a.id, userId: ctx.user.id })),
    skipDuplicates: true,
  });
}
