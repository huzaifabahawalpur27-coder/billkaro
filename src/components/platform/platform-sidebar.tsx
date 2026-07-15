"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  CreditCard,
  Layers,
  Megaphone,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Tenants", icon: Store },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/plans", label: "Plans", icon: Layers },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export function PlatformSidebar({
  adminName,
  logoutSlot,
}: {
  adminName: string;
  logoutSlot: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-slate-950 text-slate-200">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-800">
        <ShieldCheck className="h-6 w-6 text-indigo-400" />
        <div>
          <div className="font-bold leading-tight">BillKaro</div>
          <div className="text-[10px] uppercase tracking-widest text-indigo-400">Platform Admin</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-800 p-3 text-sm">
        <div className="mb-2 truncate font-medium">{adminName}</div>
        {logoutSlot}
      </div>
    </aside>
  );
}
