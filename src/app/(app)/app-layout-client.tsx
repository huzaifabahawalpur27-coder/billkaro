"use client";

import { useState } from "react";
import { Menu, Plus, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import type { MyAnnouncement } from "@/server/services/announcements";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AnnouncementsBell } from "@/components/app/announcements-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AppLayoutClientProps {
  businessName: string;
  userName: string;
  roleName: string;
  impersonating?: boolean;
  exitImpersonation?: () => Promise<void>;
  subscriptionBanner?: { status: "GRACE" | "EXPIRED"; daysLeft: number } | null;
  announcements?: MyAnnouncement[];
  markAnnouncementsSeen?: (ids: string[]) => Promise<void>;
  children: React.ReactNode;
}

export function AppLayoutClient({
  businessName,
  userName,
  roleName,
  impersonating = false,
  exitImpersonation,
  subscriptionBanner = null,
  announcements = [],
  markAnnouncementsSeen,
  children,
}: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Desktop instance owns the toast side-effect; the mobile one is display-only
  // (both are mounted regardless of viewport — CSS hides, React doesn't).
  const desktopBell = markAnnouncementsSeen ? (
    <AnnouncementsBell announcements={announcements} markSeen={markAnnouncementsSeen} toastOnMount />
  ) : null;
  const mobileBell = markAnnouncementsSeen ? (
    <AnnouncementsBell announcements={announcements} markSeen={markAnnouncementsSeen} />
  ) : null;

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

        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 print:hidden">
          <div className="text-sm text-muted-foreground">{formatDate(new Date())}</div>
          <div className="flex items-center gap-2">
            {desktopBell}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100"
                  aria-label="User menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden lg:block text-left leading-tight">
                    <span className="block text-sm font-medium">{userName}</span>
                    <span className="block text-[10px] text-muted-foreground">{roleName}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-sm">{userName}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {roleName} · {businessName}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut className="h-4 w-4 mr-2" /> Logout
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

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

          <div className="flex items-center gap-1">
            {mobileBell}
            <Link
              href="/bill"
              className="inline-flex h-8 items-center justify-center gap-1 rounded bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Naya Bill</span>
            </Link>
          </div>
        </header>

        {/* Page content scroll container */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
