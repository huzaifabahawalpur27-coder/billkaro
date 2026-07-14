import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";

export type PlatformAction =
  | "TENANT_UPDATED"
  | "TENANT_SUSPENDED"
  | "TENANT_ACTIVATED"
  | "PLAN_CREATED"
  | "PLAN_UPDATED"
  | "SUBSCRIPTION_ASSIGNED"
  | "SUBSCRIPTION_EXTENDED"
  | "PAYMENT_RECORDED"
  | "IMPERSONATION_STARTED"
  | "IMPERSONATION_ENDED";

/** Write a platform audit row. Pass `tx` when inside a transaction. */
export function logPlatformAction(
  client: Prisma.TransactionClient | typeof db,
  entry: {
    actorId: string;
    action: PlatformAction;
    targetBusinessId?: string | null;
    targetType?: string;
    targetId?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return client.platformAuditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetBusinessId: entry.targetBusinessId ?? null,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata,
    },
  });
}

export async function listPlatformAudit(page = 1) {
  await requirePlatformAdmin();
  const pageSize = 50;
  const [entries, total] = await Promise.all([
    db.platformAuditLog.findMany({
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
    }),
    db.platformAuditLog.count(),
  ]);

  // Resolve target business names in one query.
  const businessIds = [
    ...new Set(entries.map((e) => e.targetBusinessId).filter((id): id is string => !!id)),
  ];
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(businesses.map((b) => [b.id, b.name]));

  return {
    entries: entries.map((e) => ({
      id: e.id,
      action: e.action,
      actorName: e.actor.name,
      actorEmail: e.actor.email,
      businessName: e.targetBusinessId ? (nameById.get(e.targetBusinessId) ?? "(deleted)") : null,
      metadata: e.metadata,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page: Math.max(1, page),
    pageSize,
  };
}
