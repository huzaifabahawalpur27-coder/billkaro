"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenText, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface KhataRow {
  id: string;
  name: string;
  phone: string | null;
  currentBalance: string;
  lastTransactionAt: string | null;
  lastPaymentAt: string | null;
}

export function KhataView({
  rows,
  totalUdhaar,
  currencySymbol,
  can,
}: {
  rows: KhataRow[];
  totalUdhaar: string;
  currencySymbol: string;
  can: { receivePayment: boolean };
}) {
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          (r.phone && r.phone.includes(q))
      )
    : rows;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/40 border-amber-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-amber-700 dark:text-amber-300">Total Pending Udhaar</p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {currencySymbol} {parseFloat(totalUdhaar).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-amber-600">
          <BookOpenText className="h-8 w-8 opacity-60" />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Customer ka naam ya phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title="Koi udhaar nahi"
          description="Abhi kisi customer ka udhaar nahi hai."
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/khata/${row.id}`}
              className="flex items-center justify-between rounded-lg border bg-white dark:bg-slate-900 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.phone && <span>{row.phone} · </span>}
                  {row.lastTransactionAt
                    ? `Last: ${formatDate(row.lastTransactionAt)}`
                    : "Koi transaction nahi"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <MoneyDisplay
                  value={row.currentBalance}
                  tone={parseFloat(row.currentBalance) > 0 ? "due" : undefined}
                  className={cn("font-semibold text-base")}
                />
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-slate-700" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
