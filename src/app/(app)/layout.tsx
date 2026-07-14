import { requireBusiness } from "@/server/auth/guards";
import { AppLayoutClient } from "./app-layout-client";
import { exitImpersonationAction } from "./impersonation-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusiness();
  const sub = ctx.subscriptionState;

  return (
    <AppLayoutClient
      businessName={ctx.business.name}
      userName={ctx.user.name}
      roleName={ctx.role.name}
      impersonating={ctx.impersonating}
      exitImpersonation={exitImpersonationAction}
      subscriptionBanner={
        sub && (sub.status === "GRACE" || sub.status === "EXPIRED")
          ? { status: sub.status, daysLeft: sub.daysLeft ?? 0 }
          : null
      }
    >
      {children}
    </AppLayoutClient>
  );
}
