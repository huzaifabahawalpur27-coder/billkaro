"use client";

import { useState } from "react";
import { Menu, X, Plus } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppLayoutClientProps {
  businessName: string;
  userName: string;
  roleName: string;
  impersonating?: boolean;
  exitImpersonation?: () => Promise<void>;
  subscriptionBanner?: { status: "GRACE" | "EXPIRED"; daysLeft: number } | null;
  children: React.ReactNode;
}

export function AppLayoutClient({
  businessName,
  userName,
  roleName,
  impersonating = false,
  exitImpersonation,
  subscriptionBanner = null,
  children,
}: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      
      {/* Sidebar overlay backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar wrapper */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] transform flex-col transition-transform duration-300 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AppSidebar
          businessName={businessName}
          userName={userName}
          roleName={roleName}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Platform admin impersonation bar */}
        {impersonating && exitImpersonation && (
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950 print:hidden">
            <span>Platform admin mode — {businessName}</span>
            <form action={exitImpersonation}>
              <Button type="submit" size="sm" variant="outline" className="h-6 bg-white/70 text-xs">
                Return to Admin
              </Button>
            </form>
          </div>
        )}

        {/* Subscription grace / read-only banner */}
        {subscriptionBanner && (
          <div
            className={cn(
              "px-4 py-1.5 text-center text-sm font-medium print:hidden",
              subscriptionBanner.status === "GRACE"
                ? "bg-amber-100 text-amber-900"
                : "bg-red-600 text-white"
            )}
          >
            {subscriptionBanner.status === "GRACE"
              ? `Subscription khatam ho chuki hai — ${subscriptionBanner.daysLeft} din baaki, phir app read-only ho jayegi. Renew karayein.`
              : "Read-only mode: subscription khatam. Naye bill aur payments band hain — renew karne ke liye rabta karein."}
          </div>
        )}

        {/* Mobile Header Bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-bold text-sm text-slate-800">{businessName}</span>
          </div>

          <Link
            href="/bill"
            className="inline-flex h-8 items-center justify-center gap-1 rounded bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Naya Bill</span>
          </Link>
        </header>

        {/* Page content scroll container */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
