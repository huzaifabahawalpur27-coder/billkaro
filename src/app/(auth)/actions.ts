"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/passwords";
import { createSession, destroySession } from "@/server/auth/session";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { createBusinessForUser } from "@/server/services/onboarding";

export interface AuthFormState {
  error: string | null;
}

const registerSchema = z.object({
  ownerName: z.string().trim().min(2, "Apna naam enter karein (kam az kam 2 huroof)."),
  email: z.string().trim().toLowerCase().email("Sahi email address enter karein."),
  password: z.string().min(6, "Password kam az kam 6 characters ka hona chahiye."),
  businessName: z.string().trim().min(2, "Shop / business ka naam enter karein."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Sahi email address enter karein."),
  password: z.string().min(1, "Password enter karein."),
});

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!checkRateLimit(`register:${await clientKey()}`, { limit: 5, windowMs: 60_000 })) {
    return { error: "Bohat zyada koshishen. Thori dair baad dubara try karein." };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const input = parsed.data;

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { error: "Is email se account pehle se mojood hai. Login karein." };
  }

  const passwordHash = await hashPassword(input.password);

  const { userId, businessId } = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.ownerName,
        phone: input.phone || null,
      },
    });
    const business = await createBusinessForUser(tx, user.id, {
      name: input.businessName,
      ownerName: input.ownerName,
      phone: input.phone || undefined,
    });
    return { userId: user.id, businessId: business.id };
  });

  await createSession({ userId, businessId });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!checkRateLimit(`login:${await clientKey()}`, { limit: 10, windowMs: 60_000 })) {
    return { error: "Bohat zyada koshishen. Thori dair baad dubara try karein." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ya password ghalat hai." };
  }

  const membership = await db.businessUser.findFirst({
    where: { userId: user.id, status: "ACTIVE", business: { status: "ACTIVE" } },
    orderBy: { createdAt: "asc" },
  });

  await createSession({ userId: user.id, businessId: membership?.businessId ?? null });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
