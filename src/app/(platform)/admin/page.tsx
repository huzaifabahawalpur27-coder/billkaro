import Link from "next/link";
import { getPlatformDashboard } from "@/server/services/platform/dashboard";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const SUB_BADGE: Record<string, StatusKind> = {
  ACTIVE: "active",
  TRIAL: "neutral",
  GRACE: "warning",
  EXPIRED: "danger",
};

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default async function PlatformDashboardPage() {
  const d = await getPlatformDashboard();

  return (
    <>
      <PageHeader title="Platform Dashboard" subtitle="Tenants, subscriptions aur revenue ka overview" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Tenants" value={d.totalTenants} sub={`${d.suspendedTenants} suspended`} />
        <Kpi label="Active / Trial" value={`${d.activeSubs} / ${d.trialSubs}`} sub={`${d.unsubscribed} without subscription`} />
        <Kpi label="Grace / Expired" value={`${d.graceSubs} / ${d.expiredSubs}`} sub="need follow-up" />
        <Kpi
          label="This Month"
          value={<MoneyDisplay value={d.monthRevenue} />}
          sub={`${d.monthPaymentCount} payments`}
        />
      </div>

      <div className="mt-6 rounded-lg border bg-white">
        <div className="border-b px-4 py-3 font-semibold text-sm">
          Upcoming Renewals (7 din) & Grace
        </div>
        {d.renewals.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Koi renewal due nahi.</p>
        ) : (
          <ul className="divide-y">
            {d.renewals.map((r) => (
              <li key={r.businessId}>
                <Link
                  href={`/admin/tenants/${r.businessId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{r.businessName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.planName}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <StatusBadge kind={SUB_BADGE[r.status] ?? "neutral"}>{r.status}</StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.effectiveUntil)} · {r.daysLeft}d
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
