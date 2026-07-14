"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getSession, createSession } from "@/server/auth/session";
import { logPlatformAction } from "@/server/services/platform/audit";

/** Return from an impersonated tenant session to the admin portal. */
export async function exitImpersonationAction(): Promise<void> {
  const session = await getSession();
  if (!session?.impersonatorId) redirect("/dashboard");

  await logPlatformAction(db, {
    actorId: session.impersonatorId,
    action: "IMPERSONATION_ENDED",
    targetBusinessId: session.businessId,
  });
  await createSession({ userId: session.impersonatorId, businessId: null });
  redirect("/admin/tenants");
}
