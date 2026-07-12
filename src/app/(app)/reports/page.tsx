import { getSalesSummary, getTopProducts, getTopCustomers, getUdhaarAgeing } from "@/server/services/reports";
import { requireBusiness } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { MoneyDisplay } from "@/components/app/money-display";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Period = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL_TIME";

interface SearchParams { period?: string }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await requireBusiness();

  const validPeriods: Period[] = ["TODAY", "THIS_WEEK", "THIS_MONTH", "ALL_TIME"];
  const period: Period = validPeriods.includes(params.period as Period)
    ? (params.period as Period)
    : "THIS_MONTH";

  const [summary, topProducts, topCustomers, ageing] = await Promise.all([
    getSalesSummary(period),
    getTopProducts(10),
    getTopCustomers(10),
    getUdhaarAgeing(),
  ]);

  const sym = ctx.settings.currencySymbol;

  const PERIOD_LABELS: Record<Period, string> = {
    TODAY: "Aaj",
    THIS_WEEK: "Is Hafte",
    THIS_MONTH: "Is Mahine",
    ALL_TIME: "Sab",
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales aur udhaar ka jaiza" />

      {/* Period selector */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {validPeriods.map((p) => (
          <Link
            key={p}
            href={`/reports?period=${p}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
              period === p
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Sales</p>
          <p className="text-2xl font-bold mt-1">
            <MoneyDisplay value={summary.totalSales} symbol={sym} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{summary.billCount} bills</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cash / Card Received</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            <MoneyDisplay value={summary.totalReceived} symbol={sym} />
          </p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Udhaar Diya</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            <MoneyDisplay value={summary.totalUdhaar} symbol={sym} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{summary.udhaarBills} udhaar bills</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-xl border p-5">
          <h2 className="text-sm font-semibold mb-4">Top Products (Revenue)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Koi data nahi.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center text-xs text-muted-foreground shrink-0">{i + 1}</span>
                    <span className="truncate font-medium">{p.name}</span>
                  </div>
                  <MoneyDisplay value={p.totalRevenue} symbol={sym} className="shrink-0 tabular-nums" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top customers by udhaar */}
        <div className="rounded-xl border p-5">
          <h2 className="text-sm font-semibold mb-4">Highest Udhaar Customers</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Koi udhaar nahi.</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center text-xs text-muted-foreground shrink-0">{i + 1}</span>
                    <Link href={`/khata/${c.id}`} className="truncate font-medium hover:underline text-indigo-700">
                      {c.name}
                    </Link>
                  </div>
                  <MoneyDisplay value={c.balance} symbol={sym} tone="due" className="shrink-0 tabular-nums" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Udhaar ageing */}
        <div className="rounded-xl border p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4">Udhaar Ageing</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "0–7 Days", value: ageing.within7Days, color: "text-amber-600" },
              { label: "7–30 Days", value: ageing.within30Days, color: "text-orange-600" },
              { label: "30+ Days", value: ageing.older, color: "text-red-700" },
            ].map((b) => (
              <div key={b.label} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{b.label}</p>
                <p className={`text-xl font-bold mt-1 ${b.color}`}>
                  <MoneyDisplay value={b.value} symbol={sym} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
