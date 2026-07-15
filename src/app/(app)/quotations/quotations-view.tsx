"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, FileClock } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";

export interface QuotationRow {
  id: string;
  quotationNumber: string;
  customerName: string | null;
  grandTotal: string;
  itemCount: number;
  validUntil: string;
  status: "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELLED";
  convertedSaleId: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<QuotationRow["status"], StatusKind> = {
  ACTIVE: "active",
  EXPIRED: "warning",
  CONVERTED: "neutral",
  CANCELLED: "cancelled",
};

const ALL = "__all__";

export function QuotationsView({
  rows,
  total,
  page,
  pageSize,
  currencySymbol,
}: {
  rows: QuotationRow[];
  total: number;
  page: number;
  pageSize: number;
  currencySymbol: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");
      params.delete("page");
      router.replace(`/quotations?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setStatus = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete("status");
    else params.set("status", value);
    params.delete("page");
    router.replace(`/quotations?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.replace(`/quotations?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 bg-white dark:bg-slate-900"
            placeholder="Quotation number ya customer se search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Quotation search"
          />
        </div>
        <Select value={searchParams.get("status") ?? ALL} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-white dark:bg-slate-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileClock}
          title="Koi quotation nahi"
          description="POS screen se 'Save as Quotation' use karein."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/quotations/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white dark:bg-slate-900 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{r.quotationNumber}</span>
                    <StatusBadge kind={STATUS_BADGE[r.status]}>{r.status}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.customerName ?? "Walk-in"} · {r.itemCount} items ·{" "}
                    {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <MoneyDisplay
                    value={r.grandTotal}
                    symbol={currencySymbol}
                    className="font-bold"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valid till {formatDate(r.validUntil)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} quotations · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
