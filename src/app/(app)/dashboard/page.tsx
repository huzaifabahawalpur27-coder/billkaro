import { getDashboardSummary } from "@/server/services/reports";
import { requireBusiness } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { MoneyDisplay } from "@/components/app/money-display";
import Link from "next/link";
import { ReceiptText, Users, Package, BookOpenText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await requireBusiness();
  const summary = await getDashboardSummary();

  const { today, totalCustomers, totalProducts, totalUdhaarBalance, udhaarCustomerCount } = summary;

  return (
    <>
      <PageHeader
        title={ctx.business.name}
        subtitle={`Khush amadeed, ${ctx.user.name}!`}
      />

      {/* Today stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aaj ki Sales</p>
            <ReceiptText className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <MoneyDisplay value={today.totalSales} symbol={ctx.settings.currencySymbol} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{today.billCount} bills</p>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aaj ki Receipt</p>
            <ReceiptText className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            <MoneyDisplay value={today.totalReceived} symbol={ctx.settings.currencySymbol} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cash + payments</p>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Udhaar</p>
            <BookOpenText className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">
            <MoneyDisplay value={totalUdhaarBalance} symbol={ctx.settings.currencySymbol} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{udhaarCustomerCount} customers</p>
        </div>

        <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aaj ka Udhaar</p>
            <BookOpenText className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            <MoneyDisplay value={today.totalUdhaar} symbol={ctx.settings.currencySymbol} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{today.udhaarBills} bills</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/bill"
          className="flex items-center gap-4 rounded-xl border bg-indigo-600 text-white px-5 py-4 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <ReceiptText className="h-6 w-6" />
          <div>
            <p className="font-semibold">Naya Bill Banao</p>
            <p className="text-xs text-indigo-200">POS screen par jao</p>
          </div>
        </Link>
        <Link
          href="/khata"
          className="flex items-center gap-4 rounded-xl border bg-white dark:bg-slate-900 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <BookOpenText className="h-6 w-6 text-amber-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Udhaar Khata</p>
            <p className="text-xs text-muted-foreground">{udhaarCustomerCount} customers with balance</p>
          </div>
        </Link>
        <Link
          href="/customers"
          className="flex items-center gap-4 rounded-xl border bg-white dark:bg-slate-900 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Customers</p>
            <p className="text-xs text-muted-foreground">{totalCustomers} active</p>
          </div>
        </Link>
        <Link
          href="/products"
          className="flex items-center gap-4 rounded-xl border bg-white dark:bg-slate-900 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Package className="h-6 w-6 text-purple-600" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Products</p>
            <p className="text-xs text-muted-foreground">{totalProducts} in catalogue</p>
          </div>
        </Link>
      </div>
    </>
  );
}
