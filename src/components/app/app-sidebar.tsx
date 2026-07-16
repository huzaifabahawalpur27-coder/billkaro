"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  FolderOpen,
  Ruler,
  Users,
  BookOpenText,
  FileSearch,
  ScrollText,
  BarChart3,
  UserCog,
  Settings,
  Store,
  FileClock,
  LogOut,
  Plus,
  X,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import { t } from "@/lib/i18n";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Only shown when the quotations feature toggle is on. */
  requiresQuotations?: boolean;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Products",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/brands", label: "Brands", icon: Tags },
      { href: "/categories", label: "Categories", icon: FolderOpen },
      { href: "/units", label: "Units", icon: Ruler },
    ],
  },
  {
    label: "Customers",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/khata", label: "Udhaar Khata", icon: BookOpenText },
    ],
  },
  {
    label: "Transactions",
    items: [
      { href: "/bills", label: "Bills", icon: FileSearch },
      { href: "/cashbook", label: "Cash Book", icon: Wallet },
      { href: "/quotations", label: "Quotations", icon: FileClock, requiresQuotations: true },
      { href: "/ledger", label: "Ledger", icon: ScrollText },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/staff", label: "Staff Book", icon: Users },
      { href: "/users", label: "Users", icon: UserCog },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  businessName: string;
  userName: string;
  roleName: string;
  quotationsEnabled?: boolean;
  language?: string;
  onClose?: () => void;
}

export function AppSidebar({
  businessName,
  userName,
  roleName,
  quotationsEnabled = false,
  language = "en",
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-slate-800 print:hidden shadow-sm select-none">
      {/* Brand + business */}
      <div className="border-b border-slate-200 px-4 py-4 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white shrink-0 shadow-sm">
              BK
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 truncate">BillKaro</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
            <Store className="size-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-bold">{businessName}</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 md:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* New Bill — the most prominent action */}
      <div className="px-3 pt-3">
        <Link
          href="/bill"
          onClick={onClose}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-bold transition-all shadow-sm",
            pathname === "/bill"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-indigo-500 text-white hover:bg-indigo-600"
          )}
        >
          <Plus className="size-4" />
          {t("pos.new_bill", language)}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group, gi) => {
          const groupKey = group.label ? `nav.${group.label.toLowerCase()}` : "";
          return (
            <div key={gi} className={cn(gi > 0 && "mt-4")}>
              {group.label && (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(groupKey, language)}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items
                  .filter((item) => !item.requiresQuotations || quotationsEnabled)
                  .map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    const itemKey =
                      item.label === "Udhaar Khata"
                        ? "nav.khata"
                        : item.label === "Cash Book"
                        ? "nav.cashbook"
                        : item.label === "Staff Book"
                        ? "nav.staff"
                        : `nav.${item.label.toLowerCase()}`;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-semibold transition-all",
                            active
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                              : "text-slate-650 hover:bg-slate-200/40 hover:text-slate-900"
                          )}
                        >
                          <item.icon className="size-4" />
                          {t(itemKey, language)}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 px-4 py-3 bg-slate-100/40">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{userName}</div>
            <div className="text-xs text-slate-500 font-medium">{roleName}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Logout"
              className="flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
