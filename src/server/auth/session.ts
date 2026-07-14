import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "billkaro_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days, rolling

export interface SessionPayload {
  userId: string;
  businessId: string | null;
  /** Set only while a platform admin is impersonating a tenant (SaaS mode). */
  impersonatorId?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET env var must be set to a value of 16+ characters");
  }
  return new TextEncoder().encode(secret);
}

/** Create/replace the session cookie. Call from Server Actions only. */
export async function createSession(
  payload: SessionPayload,
  maxAgeSeconds: number = MAX_AGE_SECONDS
): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      businessId: (payload.businessId as string | undefined) ?? null,
      impersonatorId: payload.impersonatorId as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
