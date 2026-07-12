import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { SYSTEM_ROLES } from "@/lib/permissions";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NewBusinessInput {
  name: string;
  ownerName: string;
  phone?: string;
  address?: string;
  businessType?: string;
}

/**
 * Creates a business with its settings, system roles, document counters,
 * and makes `userId` its Owner. Must be called inside a transaction.
 */
export async function createBusinessForUser(
  tx: Db,
  userId: string,
  input: NewBusinessInput
) {
  const business = await tx.business.create({
    data: {
      name: input.name,
      ownerName: input.ownerName,
      phone: input.phone,
      address: input.address,
      businessType: input.businessType,
      settings: { create: {} }, // PKR / Rs. / INV / PAY defaults from schema
      counters: {
        createMany: {
          data: [
            { key: "INVOICE", nextNumber: 1 },
            { key: "PAYMENT", nextNumber: 1 },
          ],
        },
      },
    },
  });

  let ownerRoleId: string | null = null;
  for (const [name, permissions] of Object.entries(SYSTEM_ROLES)) {
    const role = await tx.role.create({
      data: { businessId: business.id, name, isSystem: true, permissions },
    });
    if (name === "Owner") ownerRoleId = role.id;
  }

  await tx.businessUser.create({
    data: { businessId: business.id, userId, roleId: ownerRoleId! },
  });

  return business;
}
