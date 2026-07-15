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
    <div className="flex min-h-screen">
      {/* ── Hero Panel (left / top on mobile) ────────────────────── */}
      <div className="relative hidden overflow-hidden md:flex md:w-[480px] lg:w-[520px] xl:w-[560px] flex-col justify-between p-10 text-white">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, #065f46 0%, #047857 25%, #0d9488 50%, #065f46 75%, #047857 100%)",
            backgroundSize: "400% 400%",
            animation: "heroGradient 12s ease infinite",
          }}
        />
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top: Logo + tagline */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
              <span className="text-xl font-bold leading-none">₨</span>
            </div>
            <h1 className="text-[1.7rem] font-bold tracking-tight">
              BillKaro
            </h1>
          </div>
          <p className="text-sm text-emerald-100/80 ml-0.5">
            Pakistan&apos;s #1 Digital Bill Book for Dukaandaar
          </p>
        </div>

        {/* Middle: Features */}
        <div className="space-y-5 -mt-4">
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mt-0.5 shrink-0">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="font-semibold text-[0.95rem] text-white">Digital Bill Book</p>
              <p className="text-sm text-emerald-100/70 leading-snug">
                Professional bills banayein — koi kagaz nahi, koi mushkil nahi
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mt-0.5 shrink-0">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="font-semibold text-[0.95rem] text-white">Rate List</p>
              <p className="text-sm text-emerald-100/70 leading-snug">
                Tamam products ki rates ek jagah — tezi se billing karein
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 mt-0.5 shrink-0">
              <span className="text-lg">📒</span>
            </div>
            <div>
              <p className="font-semibold text-[0.95rem] text-white">Udhaar Khata</p>
              <p className="text-sm text-emerald-100/70 leading-snug">
                Customers ka hisaab digital — kabhi bhoolein nahi
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Social proof */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[
                "bg-amber-400",
                "bg-sky-400",
                "bg-rose-400",
                "bg-violet-400",
              ].map((color, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${color} border-2 border-emerald-800 flex items-center justify-center text-[10px] font-bold text-white`}
                >
                  {["B", "A", "S", "K"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-emerald-100/80">
              <span className="font-semibold text-white">2,000+</span> dukaandaar use kar rahe hain
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300/90">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="w-3.5 h-3.5 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-xs text-emerald-100/60 ml-1">
              4.9/5 rating
            </span>
          </div>
        </div>
      </div>

      {/* ── Form Panel (right / full on mobile) ──────────────────── */}
      <div className="flex flex-1 flex-col bg-slate-50/80">
        {/* Mobile-only compact header */}
        <div className="flex items-center gap-2.5 px-5 py-4 md:hidden bg-gradient-to-r from-emerald-700 to-teal-600 text-white">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
            <span className="text-sm font-bold leading-none">₨</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              BillKaro
            </h1>
            <p className="text-[11px] text-emerald-100/80 mt-0.5">
              Digital Bill Book · Rate List · Udhaar Khata
            </p>
          </div>
        </div>

        {/* Centered form area */}
        <div className="flex flex-1 items-center justify-center px-5 py-10 md:px-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        {/* Footer */}
        <p className="pb-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} BillKaro · Made in 🇵🇰
        </p>
      </div>

      {/* Gradient keyframes */}
      <style>{`
        @keyframes heroGradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
