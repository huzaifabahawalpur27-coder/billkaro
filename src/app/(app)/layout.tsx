import { requireBusiness } from "@/server/auth/guards";

/**
 * Authenticated application shell. The full sidebar/header shell lands in
 * Phase UI-1; this layout already enforces auth + tenant membership for
 * every page inside the (app) group.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBusiness();
  return <div className="flex min-h-screen flex-col bg-slate-50">{children}</div>;
}
