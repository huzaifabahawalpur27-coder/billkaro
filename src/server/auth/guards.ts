import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import type { Permission } from "@/generated/prisma/enums";
import type { Role } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { isSaasMode } from "@/lib/platform";
import {
  computeSubscriptionState,
  type SubscriptionState,
} from "@/server/platform/subscription-state";
import { READ_PERMISSIONS, SYSTEM_ROLES } from "@/lib/permissions";
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

const businessInclude = {
  settings: true,
  subscription: { select: { trialEndsAt: true, paidUntil: true, graceDays: true, cancelledAt: true } },
} as const;

function subscriptionStateOf(business: {
  subscription: {
    trialEndsAt: Date | null;
    paidUntil: Date | null;
    graceDays: number;
    cancelledAt: Date | null;
  } | null;
}): SubscriptionState | null {
  // Standalone installs: no subscription concept at all.
  if (!isSaasMode()) return null;
  return computeSubscriptionState(business.subscription);
}

export const requireBusiness = cache(async () => {
  const { user, session } = await requireAuth();
  if (!session.businessId) redirect("/login");

  // Platform admin inside a tenant: no membership row exists — synthesize
  // an owner-level context. Mutations still attribute to the admin's real
  // user id, and the layout shows an impersonation banner.
  if (session.impersonatorId && user.isPlatformAdmin && isSaasMode()) {
    const business = await db.business.findUnique({
      where: { id: session.businessId },
      include: businessInclude,
    });
    if (!business || !business.settings) redirect("/admin/tenants");
    const virtualRole: Role = {
      id: "platform-admin",
      businessId: business.id,
      name: "Platform Admin",
      isSystem: true,
      permissions: [...SYSTEM_ROLES.Owner],
      createdAt: new Date(),
    };
    return {
      user,
      business,
      settings: business.settings,
      role: virtualRole,
      permissions: new Set<Permission>(SYSTEM_ROLES.Owner),
      subscriptionState: subscriptionStateOf(business),
      impersonating: true,
    };
  }

  const membership = await db.businessUser.findFirst({
    where: {
      userId: user.id,
      businessId: session.businessId,
      status: "ACTIVE",
      business: { status: "ACTIVE" },
    },
    include: {
      role: true,
      business: { include: businessInclude },
    },
  });
  if (!membership || !membership.business.settings) redirect("/login");

  return {
    user,
    business: membership.business,
    settings: membership.business.settings,
    role: membership.role,
    permissions: new Set<Permission>(membership.role.permissions),
    subscriptionState: subscriptionStateOf(membership.business),
    impersonating: false,
  };
});

export type BusinessContext = Awaited<ReturnType<typeof requireBusiness>>;

/**
 * Platform (SaaS) superadmin gate. 404s outright when the install is not
 * running in saas mode, so /admin does not exist on offline installs.
 */
export const requirePlatformAdmin = cache(async () => {
  if (!isSaasMode()) notFound();
  const { user, session } = await requireAuth();
  if (!user.isPlatformAdmin) redirect("/dashboard");
  return { user, session };
});

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

export class SubscriptionExpiredError extends Error {
  constructor() {
    super("Subscription expired — tenant is read-only");
    this.name = "SubscriptionExpiredError";
  }
}

/**
 * Guard for server actions/services that need a specific permission.
 *
 * In SaaS mode an EXPIRED subscription turns the tenant read-only: any
 * permission outside READ_PERMISSIONS throws unless the call site is a
 * read path that merely reuses a write permission (pass { read: true }).
 */
export async function requirePermission(
  permission: Permission,
  opts?: { read?: boolean }
): Promise<BusinessContext> {
  const ctx = await requireBusiness();
  if (!ctx.permissions.has(permission)) throw new PermissionDeniedError(permission);
  if (
    ctx.subscriptionState?.status === "EXPIRED" &&
    !READ_PERMISSIONS.has(permission) &&
    !opts?.read
  ) {
    throw new SubscriptionExpiredError();
  }
  return ctx;
}

export function hasPermission(ctx: BusinessContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}
