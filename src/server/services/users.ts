import "server-only";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/passwords";

export async function listMembers() {
  const ctx = await requirePermission("MANAGE_USERS");
  const members = await db.businessUser.findMany({
    where: { businessId: ctx.business.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const roles = await db.role.findMany({
    where: { businessId: ctx.business.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return { members, roles, currentUserId: ctx.user.id };
}

export async function createMember(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  roleId: string;
}) {
  const ctx = await requirePermission("MANAGE_USERS");

  const role = await db.role.findFirst({
    where: { id: input.roleId, businessId: ctx.business.id },
  });
  if (!role) throw new Error("Role not found");

  return db.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: input.email } });
    if (user) {
      const existing = await tx.businessUser.findUnique({
        where: { businessId_userId: { businessId: ctx.business.id, userId: user.id } },
      });
      if (existing) throw new Error("MEMBER_EXISTS");
    } else {
      user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          passwordHash: await hashPassword(input.password),
        },
      });
    }
    const member = await tx.businessUser.create({
      data: { businessId: ctx.business.id, userId: user.id, roleId: role.id },
    });
    await tx.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "USER_ADDED",
        entityType: "BusinessUser",
        entityId: member.id,
        metadata: { email: input.email, role: role.name },
      },
    });
    return member;
  });
}

export async function updateMemberRole(memberId: string, roleId: string) {
  const ctx = await requirePermission("MANAGE_USERS");
  const member = await db.businessUser.findFirst({
    where: { id: memberId, businessId: ctx.business.id },
    include: { role: true },
  });
  if (!member) throw new Error("Member not found");
  if (member.userId === ctx.user.id) throw new Error("CANNOT_EDIT_SELF");

  const role = await db.role.findFirst({
    where: { id: roleId, businessId: ctx.business.id },
  });
  if (!role) throw new Error("Role not found");

  await db.$transaction([
    db.businessUser.update({ where: { id: member.id }, data: { roleId: role.id } }),
    db.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: "USER_ROLE_CHANGED",
        entityType: "BusinessUser",
        entityId: member.id,
        metadata: { from: member.role.name, to: role.name },
      },
    }),
  ]);
}

export async function setMemberStatus(memberId: string, active: boolean) {
  const ctx = await requirePermission("MANAGE_USERS");
  const member = await db.businessUser.findFirst({
    where: { id: memberId, businessId: ctx.business.id },
  });
  if (!member) throw new Error("Member not found");
  if (member.userId === ctx.user.id) throw new Error("CANNOT_EDIT_SELF");

  await db.$transaction([
    db.businessUser.update({
      where: { id: member.id },
      data: { status: active ? "ACTIVE" : "DISABLED" },
    }),
    db.auditLog.create({
      data: {
        businessId: ctx.business.id,
        userId: ctx.user.id,
        action: active ? "USER_ENABLED" : "USER_DISABLED",
        entityType: "BusinessUser",
        entityId: member.id,
      },
    }),
  ]);
}
