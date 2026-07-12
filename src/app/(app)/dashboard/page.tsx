import { requireBusiness } from "@/server/auth/guards";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const { user, business } = await requireBusiness();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Logged in as {user.name}. Dashboard modules arrive in later phases.
      </p>
      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Logout
        </Button>
      </form>
    </div>
  );
}
