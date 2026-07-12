import { requireBusiness } from "@/server/auth/guards";
import { AppSidebar } from "@/components/app/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusiness();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar
        businessName={ctx.business.name}
        userName={ctx.user.name}
        roleName={ctx.role.name}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-5">{children}</div>
      </main>
    </div>
  );
}
