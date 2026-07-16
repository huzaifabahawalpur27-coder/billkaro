"use client";

import { useState, useTransition, useEffect } from "react";
import { ReceiptText, Wallet, BookOpenText, FileText, Calendar } from "lucide-react";
import { MoneyDisplay } from "@/components/app/money-display";
import { cn } from "@/lib/utils";
import { fetchCustomSummaryAction } from "./actions";
import { Input } from "@/components/ui/input";

export interface PeriodSummary {
  totalSales: string;
  totalReceived: string;
  totalUdhaar: string;
  billCount: number;
  udhaarBills: number;
}

type PeriodKey = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

const PERIOD_LABELS: [PeriodKey, string, string][] = [
  ["TODAY", "Today", "آج"],
  ["THIS_WEEK", "Week", "اس ہفتے"],
  ["THIS_MONTH", "Month", "اس مہینے"],
  ["CUSTOM", "Date Range", "تاریخ منتخب کریں"],
];

function KpiCard({
  label,
  icon,
  value,
  sub,
  valueClass,
  cardClass,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub: string;
  valueClass?: string;
  cardClass?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md", cardClass)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        {icon}
      </div>
      <p className={cn("text-2xl font-black text-slate-900 dark:text-slate-100", valueClass)}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>
    </div>
  );
}

export function DashboardKpis({
  periods,
  totalUdhaar,
  udhaarCustomers,
  currencySymbol,
}: {
  periods: Record<string, PeriodSummary>;
  totalUdhaar: string;
  udhaarCustomers: number;
  currencySymbol: string;
}) {
  const [period, setPeriod] = useState<PeriodKey>("TODAY");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customData, setCustomData] = useState<PeriodSummary | null>(null);
  const [pending, startTransition] = useTransition();

  // Load custom summary when date range is selected
  useEffect(() => {
    if (period === "CUSTOM" && startDate && endDate) {
      startTransition(async () => {
        const result = await fetchCustomSummaryAction(startDate, endDate);
        if (result.ok && result.data) {
          setCustomData(result.data);
        }
      });
    }
  }, [period, startDate, endDate]);

  const activeData = period === "CUSTOM" && customData ? customData : periods[period] || periods.TODAY;

  return (
    <div className="mb-6 space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-sm">
        {/* Quick select tabs */}
        <div className="inline-flex rounded-lg border bg-slate-50 dark:bg-slate-950 p-0.5 text-sm">
          {PERIOD_LABELS.map(([key, labelEn, labelUr]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-md px-4 py-1.5 font-bold transition-all text-xs sm:text-sm",
                period === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50"
              )}
            >
              {labelEn}
            </button>
          ))}
        </div>

        {/* Date inputs (only visible when CUSTOM is chosen) */}
        {period === "CUSTOM" && (
          <div className="flex items-center gap-2 text-xs sm:text-sm animate-fade-in">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">From</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 py-0 px-2 w-32 focus-visible:ring-1"
                disabled={pending}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">To</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 py-0 px-2 w-32 focus-visible:ring-1"
                disabled={pending}
              />
            </div>
            {pending && (
              <span className="text-xs text-indigo-600 animate-pulse font-medium">Loading...</span>
            )}
          </div>
        )}
      </div>

      {/* KPI colorful pastel cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Sales"
          icon={<ReceiptText className="h-5 w-5 text-indigo-600" />}
          value={<MoneyDisplay value={activeData.totalSales} symbol={currencySymbol} />}
          cardClass="bg-indigo-50/70 border-indigo-100 hover:border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900"
          valueClass="text-indigo-900 dark:text-indigo-200"
          sub={`${activeData.billCount} bills`}
        />
        <KpiCard
          label="Receipt"
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
          value={<MoneyDisplay value={activeData.totalReceived} symbol={currencySymbol} />}
          valueClass="text-emerald-800 dark:text-emerald-300"
          cardClass="bg-emerald-50/70 border-emerald-100 hover:border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
          sub="Cash + payments"
        />
        <KpiCard
          label="Udhaar Diya"
          icon={<BookOpenText className="h-5 w-5 text-amber-600" />}
          value={<MoneyDisplay value={activeData.totalUdhaar} symbol={currencySymbol} />}
          valueClass="text-amber-800 dark:text-amber-300"
          cardClass="bg-amber-50/70 border-amber-100 hover:border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
          sub={`${activeData.udhaarBills} udhaar bills`}
        />
        <KpiCard
          label="Bills"
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          value={activeData.billCount}
          valueClass="text-blue-800 dark:text-blue-300"
          cardClass="bg-blue-50/70 border-blue-100 hover:border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
          sub={period === "CUSTOM" ? "Selected range" : PERIOD_LABELS.find(([k]) => k === period)?.[1] ?? ""}
        />
        <KpiCard
          label="Total Udhaar"
          icon={<BookOpenText className="h-5 w-5 text-rose-600" />}
          value={<MoneyDisplay value={totalUdhaar} symbol={currencySymbol} />}
          valueClass="text-rose-800 dark:text-rose-300"
          cardClass="bg-rose-50/70 border-rose-100 hover:border-rose-200 dark:bg-rose-950/20 dark:border-rose-900"
          sub={`${udhaarCustomers} customers — sab waqt ka`}
        />
      </div>
    </div>
  );
}
