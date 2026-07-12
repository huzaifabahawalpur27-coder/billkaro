import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Permission } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { getSession } from "./session";

/**
 * Tenant isolation happens here and only here.
 *
 * businessId is NEVER accepted from the client. It comes from the signed
 * session cookie and is re-validated against the BusinessUser membership
 * table on every request. Every service function receives businessId from
 * the context these guards return.
 */

export const requireAuth = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") redirect("/login");
  return { user, session };
});

export const requireBusiness = cache(async () => {
  const { user, session } = await requireAuth();
  if (!session.businessId) redirect("/login");

  const membership = await db.businessUser.findFirst({
    where: {
      userId: user.id,
      businessId: session.businessId,
      status: "ACTIVE",
      business: { status: "ACTIVE" },
    },
    include: {
      role: true,
      business: { include: { settings: true } },
    },
  });
  if (!membership || !membership.business.settings) redirect("/login");

  return {
    user,
    business: membership.business,
    settings: membership.business.settings,
    role: membership.role,
    permissions: new Set<Permission>(membership.role.permissions),
  };
});

export type BusinessContext = Awaited<ReturnType<typeof requireBusiness>>;

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

/** Guard for server actions/services that need a specific permission. */
export async function requirePermission(permission: Permission): Promise<BusinessContext> {
  const ctx = await requireBusiness();
  if (!ctx.permissions.has(permission)) throw new PermissionDeniedError(permission);
  return ctx;
}

export function hasPermission(ctx: BusinessContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}
