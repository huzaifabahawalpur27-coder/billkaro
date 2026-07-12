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
  children: React.ReactNode;
}

export function AppLayoutClient({
  businessName,
  userName,
  roleName,
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
