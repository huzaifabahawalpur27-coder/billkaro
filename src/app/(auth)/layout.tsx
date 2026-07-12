import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.businessId) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BillKaro
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Digital Bill Book · Rate List · Udhaar Khata
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
