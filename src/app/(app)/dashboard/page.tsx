import Link from "next/link";
import { ReceiptText, Users, Package, BookOpenText, ArrowRight } from "lucide-react";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import {
  getSalesSummary,
  getDashboardSummary,
  getTopCustomers,
  getUdhaarAgeing,
} from "@/server/services/reports";
import { listBills } from "@/server/services/bills";
import { PageHeader } from "@/components/app/page-header";
import { MoneyDisplay } from "@/components/app/money-display";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { formatTime, formatDate } from "@/lib/format";
import { DashboardKpis } from "./dashboard-view";

export const dynamic = "force-dynamic";

const BILL_BADGE: Record<string, StatusKind> = {
  PAID: "paid",
  PARTIAL: "partial",
  UDHAAR: "udhaar",
};

export default async function DashboardPage() {
  const ctx = await requireBusiness();
  const canReports = hasPermission(ctx, "VIEW_REPORTS");
  const canBills = hasPermission(ctx, "VIEW_BILLS");
  const symbol = ctx.settings.currencySymbol;

  // Widgets are permission-gated: a Cashier (no VIEW_REPORTS) still gets a
  // working dashboard with quick actions + recent bills.
  const [today, week, month, summary, topCustomers, ageing, recentBills] = await Promise.all([
    canReports ? getSalesSummary("TODAY") : null,
    canReports ? getSalesSummary("THIS_WEEK") : null,
    canReports ? getSalesSummary("THIS_MONTH") : null,
    canReports ? getDashboardSummary() : null,
    canReports ? getTopCustomers(5) : null,
    canReports ? getUdhaarAgeing() : null,
    canBills ? listBills({ page: 1 }).then((r) => r.bills.slice(0, 6)) : null,
  ]);

  return (
    <>
      <PageHeader title={ctx.business.name} subtitle={`Khush amadeed, ${ctx.user.name}!`} />

      {canReports && today && week && month && summary && (
        <DashboardKpis
          periods={{ TODAY: today, THIS_WEEK: week, THIS_MONTH: month }}
          totalUdhaar={summary.totalUdhaarBalance}
          udhaarCustomers={summary.udhaarCustomerCount}
          currencySymbol={symbol}
        />
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent bills */}
        {recentBills && (
          <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Recent Bills</h2>
              <Link
                href="/bills"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                Sab bills <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentBills.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Abhi koi bill nahi — pehla bill banayein.
              </p>
            ) : (
              <ul className="divide-y">
                {recentBills.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/bills/${b.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="font-mono font-medium">{b.invoiceNumber}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {b.customer?.name ?? "Walk-in"} · {formatTime(b.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusBadge
                          kind={
                            b.status === "CANCELLED"
                              ? "cancelled"
                              : (BILL_BADGE[b.paymentStatus] ?? "neutral")
                          }
                        >
                          {b.status === "CANCELLED" ? "CANCELLED" : b.paymentStatus}
                        </StatusBadge>
                        <MoneyDisplay value={b.grandTotal.toFixed(2)} symbol={symbol} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Udhaar focus */}
        {canReports && ageing && topCustomers && (
          <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Udhaar Focus</h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["0–7 din", ageing.within7Days, "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"],
                    ["7–30 din", ageing.within30Days, "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"],
                    ["30+ din", ageing.older, "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"],
                  ] as const
                ).map(([label, value, cls]) => (
                  <div key={label} className={`rounded-lg p-2 ${cls}`}>
                    <div className="text-[10px] font-semibold uppercase">{label}</div>
                    <div className="text-sm font-bold">
                      <MoneyDisplay value={value} symbol={symbol} />
                    </div>
                  </div>
                ))}
              </div>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Koi udhaar pending nahi.</p>
              ) : (
                <ul className="space-y-1.5">
                  {topCustomers.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/khata/${c.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span className="min-w-0 truncate">
                          {c.name}
                          {c.lastTransactionAt && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatDate(c.lastTransactionAt)}
                            </span>
                          )}
                        </span>
                        <MoneyDisplay value={c.balance} symbol={symbol} tone="due" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/bill"
          className="flex items-center gap-3 rounded-xl border bg-indigo-600 text-white px-4 py-3.5 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <ReceiptText className="h-5 w-5" />
          <div>
            <p className="text-sm font-semibold">Naya Bill</p>
            <p className="text-[11px] text-indigo-200">POS screen</p>
          </div>
        </Link>
        <Link
          href="/khata"
          className="flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-900 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <BookOpenText className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Udhaar Khata</p>
            <p className="text-[11px] text-muted-foreground">
              {summary ? `${summary.udhaarCustomerCount} customers` : "Khata dekhein"}
            </p>
          </div>
        </Link>
        <Link
          href="/customers"
          className="flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-900 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Customers</p>
            <p className="text-[11px] text-muted-foreground">
              {summary ? `${summary.totalCustomers} active` : "List dekhein"}
            </p>
          </div>
        </Link>
        <Link
          href="/products"
          className="flex items-center gap-3 rounded-xl border bg-white dark:bg-slate-900 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Package className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Products</p>
            <p className="text-[11px] text-muted-foreground">
              {summary ? `${summary.totalProducts} in catalogue` : "Rate list"}
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}
