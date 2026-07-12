"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FileSearch, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BillRow {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  customerId: string | null;
  cashierName: string;
  status: string;
  paymentStatus: string;
  grandTotal: string;
  amountPaid: string;
  amountDue: string;
  itemCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  UDHAAR: "bg-red-100 text-red-800",
};
const STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  UDHAAR: "Udhaar",
};

export function BillsView({
  rows,
  total,
  page,
  pageSize,
  currencySymbol,
  can,
}: {
  rows: BillRow[];
  total: number;
  page: number;
  pageSize: number;
  currencySymbol: string;
  can: { cancel: boolean };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const totalPages = Math.ceil(total / pageSize);

  function search(val: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set("q", val); else sp.delete("q");
    sp.delete("page");
    router.push(`/bills?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Invoice #, customer naam, ya product…"
            defaultValue={q}
            onChange={(e) => search(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {["", "PAID", "PARTIAL", "UDHAAR"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                if (s) sp.set("status", s); else sp.delete("status");
                sp.delete("page");
                router.push(`/bills?${sp.toString()}`);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium border",
                (searchParams.get("status") ?? "") === s
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {s === "" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <EmptyState icon={FileSearch} title="Koi bill nahi" description="Is filter se koi bill nahi mila." />
      ) : (
        <div className="space-y-1">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/bills/${row.id}`}
              className="flex items-center gap-4 rounded-lg border bg-white dark:bg-slate-900 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">{row.invoiceNumber}</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_COLORS[row.paymentStatus] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus}
                  </span>
                  {row.status === "CANCELLED" && (
                    <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.customerName ?? "Walk-in customer"} · {row.itemCount} items · {formatDateTime(row.createdAt)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <MoneyDisplay value={row.grandTotal} className="font-semibold" />
                {parseFloat(row.amountDue) > 0 && (
                  <p className="text-xs text-red-600">
                    Baqi: {currencySymbol} {parseFloat(row.amountDue).toFixed(2)}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-slate-700 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} bills</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" disabled={page <= 1}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page - 1));
                router.push(`/bills?${sp.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page + 1));
                router.push(`/bills?${sp.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
