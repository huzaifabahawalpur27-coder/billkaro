import Link from "next/link";
import { listSubscriptions } from "@/server/services/platform/subscriptions";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { CreditCard } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const SUB_BADGE: Record<string, StatusKind> = {
  ACTIVE: "active",
  TRIAL: "neutral",
  GRACE: "warning",
  EXPIRED: "danger",
};

export default async function SubscriptionsPage() {
  const subs = await listSubscriptions();

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Tamam tenants — jald expire hone wale pehle" />
      {subs.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Koi subscription nahi"
          description="Tenants ko plans assign karein — Tenants page se."
        />
      ) : (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coverage till</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.businessId}>
                  <TableCell>
                    <Link
                      href={`/admin/tenants/${s.businessId}`}
                      className="font-medium hover:underline"
                    >
                      {s.businessName}
                    </Link>
                    {s.businessStatus === "SUSPENDED" && (
                      <StatusBadge kind="danger" className="ml-2">
                        SUSPENDED
                      </StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.planName}</TableCell>
                  <TableCell className="text-sm">
                    <MoneyDisplay value={s.planPrice} />
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      / {s.billingCycle.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge kind={SUB_BADGE[s.status] ?? "neutral"}>{s.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.effectiveUntil ? (
                      <>
                        {formatDate(s.effectiveUntil)}
                        {s.daysLeft != null && (
                          <span className="ml-1 text-xs text-muted-foreground">({s.daysLeft}d)</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
