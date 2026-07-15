import "server-only";
import type { AnnouncementType } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { logPlatformAction } from "./audit";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listAnnouncements() {
  await requirePlatformAdmin();
  const announcements = await db.announcement.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { seenBy: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const businessIds = [
    ...new Set(
      announcements.map((a) => a.targetBusinessId).filter((id): id is string => !!id)
    ),
  ];
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(businesses.map((b) => [b.id, b.name]));

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    type: a.type,
    targetName: a.targetBusinessId
      ? (nameById.get(a.targetBusinessId) ?? "(deleted)")
      : null,
    isActive: a.isActive,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdBy: a.createdBy.name,
    createdAt: a.createdAt.toISOString(),
    seenCount: a._count.seenBy,
  }));
}

export type AnnouncementRow = Awaited<ReturnType<typeof listAnnouncements>>[number];

export interface AnnouncementInput {
  title: string;
  body: string;
  type: AnnouncementType;
  targetBusinessId?: string | null;
  expiresInDays?: number | null;
}

export async function createAnnouncement(input: AnnouncementInput) {
  const { user } = await requirePlatformAdmin();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error("CONTENT_REQUIRED");

  if (input.targetBusinessId) {
    const business = await db.business.findUnique({
      where: { id: input.targetBusinessId },
      select: { id: true },
    });
    if (!business) throw new Error("TENANT_NOT_FOUND");
  }

  return db.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title,
        body,
        type: input.type,
        targetBusinessId: input.targetBusinessId || null,
        expiresAt: input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * DAY_MS)
          : null,
        createdById: user.id,
      },
    });
    await logPlatformAction(tx, {
      actorId: user.id,
      action: "ANNOUNCEMENT_CREATED",
      targetBusinessId: input.targetBusinessId ?? null,
      targetType: "Announcement",
      targetId: announcement.id,
      metadata: { title, type: input.type, broadcast: !input.targetBusinessId },
    });
    return announcement;
  });
}

export async function setAnnouncementActive(id: string, active: boolean) {
  const { user } = await requirePlatformAdmin();
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) throw new Error("ANNOUNCEMENT_NOT_FOUND");

  await db.$transaction(async (tx) => {
    await tx.announcement.update({ where: { id }, data: { isActive: active } });
    if (!active) {
      await logPlatformAction(tx, {
        actorId: user.id,
        action: "ANNOUNCEMENT_DEACTIVATED",
        targetType: "Announcement",
        targetId: id,
        metadata: { title: existing.title },
      });
    }
  });
}
