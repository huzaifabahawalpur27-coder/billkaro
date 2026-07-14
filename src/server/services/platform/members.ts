import "server-only";
import { db } from "@/server/db";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/passwords";
import { logPlatformAction } from "./audit";

async function loadMember(memberId: string) {
  const member = await db.businessUser.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, email: true, isPlatformAdmin: true } } },
  });
  if (!member) throw new Error("MEMBER_NOT_FOUND");
  if (member.user.isPlatformAdmin) throw new Error("CANNOT_EDIT_ADMIN");
  return member;
}

/**
 * Support-desk password reset. NOTE: User accounts are global — this changes
 * the password for every business the user belongs to (the UI warns when
 * membershipCount > 1). The password itself is never written to the audit log.
 */
export async function resetMemberPassword(memberId: string, newPassword: string) {
  const { user: admin } = await requirePlatformAdmin();
  const member = await loadMember(memberId);

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: member.user.id },
      data: { passwordHash },
    });
    await logPlatformAction(tx, {
      actorId: admin.id,
      action: "USER_PASSWORD_RESET",
      targetBusinessId: member.businessId,
      targetType: "BusinessUser",
      targetId: memberId,
      metadata: { email: member.user.email },
    });
  });
}

/**
 * Membership-level enable/disable (BusinessUser.status, never User.status —
 * a user may belong to other businesses). requireBusiness re-checks the
 * membership per request, so disabling takes effect immediately.
 */
export async function setTenantMemberStatus(memberId: string, active: boolean) {
  const { user: admin } = await requirePlatformAdmin();
  const member = await loadMember(memberId);

  await db.$transaction(async (tx) => {
    await tx.businessUser.update({
      where: { id: memberId },
      data: { status: active ? "ACTIVE" : "DISABLED" },
    });
    await logPlatformAction(tx, {
      actorId: admin.id,
      action: active ? "USER_ENABLED" : "USER_DISABLED",
      targetBusinessId: member.businessId,
      targetType: "BusinessUser",
      targetId: memberId,
      metadata: { email: member.user.email },
    });
  });
}
