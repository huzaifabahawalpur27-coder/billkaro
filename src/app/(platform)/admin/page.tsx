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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Signups per month */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Signups (6 mahine)</h2>
            <span className="text-xs text-muted-foreground">
              Total GMV: <MoneyDisplay value={d.totalGmv} />
            </span>
          </div>
          <div className="space-y-2">
            {(() => {
              const max = Math.max(1, ...d.signupsByMonth.map((m) => m.count));
              return d.signupsByMonth.map((m) => (
                <div key={m.month} className="flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">{m.month}</span>
                  <div className="flex-1 rounded bg-slate-100">
                    <div
                      className="h-4 rounded bg-indigo-500"
                      style={{ width: `${(m.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-xs">{m.count}</span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Top tenants by 30-day sales */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Top Tenants (30 din sales)</h2>
          {d.topTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Abhi koi sales nahi.</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                const max = Math.max(1, ...d.topTenants.map((t) => Number(t.total)));
                return d.topTenants.map((t, i) => (
                  <Link
                    key={t.businessId}
                    href={`/admin/tenants/${t.businessId}`}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="w-40 shrink-0 truncate font-medium">{t.name}</span>
                    <div className="flex-1 rounded bg-slate-100">
                      <div
                        className="h-4 rounded bg-emerald-500"
                        style={{ width: `${(Number(t.total) / max) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums">
                      <MoneyDisplay value={t.total} />
                    </span>
                  </Link>
                ));
              })()}
            </div>
          )}
        </div>
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
