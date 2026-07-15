import { requireBusiness } from "@/server/auth/guards";
import { getMyAnnouncements } from "@/server/services/announcements";
import { AppLayoutClient } from "./app-layout-client";
import { exitImpersonationAction } from "./impersonation-actions";
import { markAnnouncementsSeenAction } from "./announcement-actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusiness();
  const sub = ctx.subscriptionState;
  const announcements = await getMyAnnouncements();

  return (
    <AppLayoutClient
      businessName={ctx.business.name}
      userName={ctx.user.name}
      roleName={ctx.role.name}
      announcements={announcements}
      markAnnouncementsSeen={markAnnouncementsSeenAction}
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
