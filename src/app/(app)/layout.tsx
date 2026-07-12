import { requireBusiness } from "@/server/auth/guards";
import { AppLayoutClient } from "./app-layout-client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusiness();

  return (
    <AppLayoutClient
      businessName={ctx.business.name}
      userName={ctx.user.name}
      roleName={ctx.role.name}
    >
      {children}
    </AppLayoutClient>
  );
}

