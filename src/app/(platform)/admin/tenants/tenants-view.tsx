"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Store } from "lucide-react";
import type { TenantRow } from "@/server/services/platform/tenants";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

const SUB_BADGE: Record<string, StatusKind> = {
  ACTIVE: "active",
  TRIAL: "neutral",
  GRACE: "warning",
  EXPIRED: "danger",
  NONE: "inactive",
};

const ALL = "__all__";

export function TenantsView({
  tenants,
  total,
  page,
  pageSize,
}: {
  tenants: TenantRow[];
  total: number;
  page: number;
  pageSize: number;
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
      router.replace(`/admin/tenants?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setStatus = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete("status");
    else params.set("status", value);
    params.delete("page");
    router.replace(`/admin/tenants?${params.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.replace(`/admin/tenants?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 bg-white"
            placeholder="Naam, owner ya phone se search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Tenant search"
          />
        </div>
        <Select value={searchParams.get("status") ?? ALL} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tenants.length === 0 ? (
        <EmptyState icon={Store} title="Koi tenant nahi mila" />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Joined {formatDate(t.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{t.ownerName}</div>
                    {t.phone && <div className="text-xs text-muted-foreground">{t.phone}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{t.planName ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge kind={SUB_BADGE[t.subscriptionStatus] ?? "neutral"}>
                      {t.subscriptionStatus}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.effectiveUntil ? (
                      <>
                        {formatDate(t.effectiveUntil)}
                        {t.daysLeft != null && (
                          <span className="ml-1 text-xs text-muted-foreground">({t.daysLeft}d)</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{t.memberCount}</TableCell>
                  <TableCell>
                    <StatusBadge kind={t.status === "ACTIVE" ? "active" : "danger"}>
                      {t.status}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} tenants · Page {page} of {totalPages}
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
