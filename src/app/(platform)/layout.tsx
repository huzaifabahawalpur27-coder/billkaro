import { requirePlatformAdmin } from "@/server/auth/guards";
import { logoutAction } from "@/app/(auth)/actions";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdmin();

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <PlatformSidebar
        adminName={user.name}
        logoutSlot={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Logout
            </Button>
          </form>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
