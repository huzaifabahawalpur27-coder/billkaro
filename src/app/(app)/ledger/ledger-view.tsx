"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScrollText, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LedgerRow {
  id: string;
  type: string;
  customerName: string;
  customerId: string;
  amount: string;
  balanceAfter: string;
  description: string;
  invoiceNumber: string | null;
  saleId: string | null;
  createdByName: string;
  createdAt: string;
}

const ENTRY_LABELS: Record<string, string> = {
  SALE_CREDIT: "Udhaar Sale",
  PAYMENT_RECEIVED: "Payment",
  OPENING_BALANCE: "Opening Balance",
  POSITIVE_ADJUSTMENT: "Increase",
  NEGATIVE_ADJUSTMENT: "Decrease",
  SALE_CANCELLED_REVERSAL: "Bill Cancelled",
};

export function LedgerView({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Koi entry nahi"
          description="Abhi tak koi ledger entry nahi hai."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border overflow-x-auto bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Balance After</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const amt = parseFloat(row.amount);
                  const isCredit = amt > 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5">
                        <Link href={`/khata/${row.customerId}`} className="font-medium hover:underline text-indigo-700">
                          {row.customerName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {isCredit ? (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          ) : (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {ENTRY_LABELS[row.type] ?? row.type}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.description}
                        {row.invoiceNumber && row.saleId && (
                          <Link href={`/bills/${row.saleId}`} className="ml-1 text-indigo-600 hover:underline text-xs">
                            ({row.invoiceNumber})
                          </Link>
                        )}
                      </td>
                      <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", isCredit ? "text-red-600" : "text-emerald-600")}>
                        {isCredit ? "+" : ""}{Math.abs(amt).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                        {parseFloat(row.balanceAfter).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {rows.map((row) => {
              const amt = parseFloat(row.amount);
              const isCredit = amt > 0;
              return (
                <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/khata/${row.customerId}`} className="font-semibold hover:underline text-indigo-700">
                        {row.customerName}
                      </Link>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(row.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {ENTRY_LABELS[row.type] ?? row.type}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                    {row.description}
                    {row.invoiceNumber && row.saleId && (
                      <Link href={`/bills/${row.saleId}`} className="ml-1 text-indigo-600 hover:underline text-[10px]">
                        ({row.invoiceNumber})
                      </Link>
                    )}
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-mono text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-sans">Amount</span>
                      <span className={isCredit ? "text-red-600" : "text-emerald-600"}>
                        {isCredit ? "+" : ""}{parseFloat(row.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-sans">Balance After</span>
                      <span className="text-slate-700 font-medium">
                        {parseFloat(row.balanceAfter).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} entries</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" disabled={page <= 1}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page - 1));
                router.push(`/ledger?${sp.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page + 1));
                router.push(`/ledger?${sp.toString()}`);
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
