"use client";

import { useState } from "react";
import { ReceiptText, Wallet, BookOpenText, FileText } from "lucide-react";
import { MoneyDisplay } from "@/components/app/money-display";
import { cn } from "@/lib/utils";

export interface PeriodSummary {
  totalSales: string;
  totalReceived: string;
  totalUdhaar: string;
  billCount: number;
  udhaarBills: number;
}

type PeriodKey = "TODAY" | "THIS_WEEK" | "THIS_MONTH";

const PERIOD_LABELS: [PeriodKey, string][] = [
  ["TODAY", "Aaj"],
  ["THIS_WEEK", "Is Hafte"],
  ["THIS_MONTH", "Is Mahine"],
];

function KpiCard({
  label,
  icon,
  value,
  sub,
  valueClass,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className={cn("text-2xl font-bold text-slate-900 dark:text-slate-100", valueClass)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export function DashboardKpis({
  periods,
  totalUdhaar,
  udhaarCustomers,
  currencySymbol,
}: {
  periods: Record<PeriodKey, PeriodSummary>;
  totalUdhaar: string;
  udhaarCustomers: number;
  currencySymbol: string;
}) {
  const [period, setPeriod] = useState<PeriodKey>("TODAY");
  const p = periods[period];

  return (
    <div className="mb-6 space-y-3">
      <div className="inline-flex rounded-lg border bg-white dark:bg-slate-900 p-0.5 text-sm shadow-sm">
        {PERIOD_LABELS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={cn(
              "rounded-md px-4 py-1.5 font-medium transition-colors",
              period === key
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Sales"
          icon={<ReceiptText className="h-4 w-4 text-indigo-500" />}
          value={<MoneyDisplay value={p.totalSales} symbol={currencySymbol} />}
          sub={`${p.billCount} bills`}
        />
        <KpiCard
          label="Receipt"
          icon={<Wallet className="h-4 w-4 text-emerald-500" />}
          value={<MoneyDisplay value={p.totalReceived} symbol={currencySymbol} />}
          valueClass="text-emerald-700 dark:text-emerald-400"
          sub="Cash + payments"
        />
        <KpiCard
          label="Udhaar Diya"
          icon={<BookOpenText className="h-4 w-4 text-amber-500" />}
          value={<MoneyDisplay value={p.totalUdhaar} symbol={currencySymbol} />}
          valueClass="text-amber-700 dark:text-amber-400"
          sub={`${p.udhaarBills} udhaar bills`}
        />
        <KpiCard
          label="Bills"
          icon={<FileText className="h-4 w-4 text-blue-500" />}
          value={p.billCount}
          sub={PERIOD_LABELS.find(([k]) => k === period)?.[1] ?? ""}
        />
        <KpiCard
          label="Total Udhaar"
          icon={<BookOpenText className="h-4 w-4 text-red-500" />}
          value={<MoneyDisplay value={totalUdhaar} symbol={currencySymbol} />}
          valueClass="text-red-700 dark:text-red-400"
          sub={`${udhaarCustomers} customers — sab waqt ka`}
        />
      </div>
    </div>
  );
}
