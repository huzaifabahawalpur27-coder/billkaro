"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, Pencil, Ban, CheckCircle2, CreditCard, CalendarPlus } from "lucide-react";
import {
  updateTenantAction,
  suspendTenantAction,
  activateTenantAction,
  assignPlanAction,
  recordPaymentAction,
  extendSubscriptionAction,
  impersonateTenantAction,
} from "../actions";
import type { getTenant } from "@/server/services/platform/tenants";
import type { PlanRow } from "@/server/services/platform/plans";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatDate, formatDateTime } from "@/lib/format";

type TenantDetail = NonNullable<Awaited<ReturnType<typeof getTenant>>>;

const SUB_BADGE: Record<string, StatusKind> = {
  ACTIVE: "active",
  TRIAL: "neutral",
  GRACE: "warning",
  EXPIRED: "danger",
  NONE: "inactive",
};

const METHODS = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank Transfer"],
  ["JAZZCASH", "JazzCash"],
  ["EASYPAISA", "Easypaisa"],
  ["OTHER", "Other"],
] as const;

export function TenantDetailView({
  detail,
  plans,
}: {
  detail: TenantDetail;
  plans: PlanRow[];
}) {
  const router = useRouter();
  const t = detail.tenant;
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<
    "edit" | "suspend" | "plan" | "payment" | "extend" | null
  >(null);

  // form state per dialog
  const [edit, setEdit] = useState({
    name: t.name,
    ownerName: t.ownerName,
    phone: t.phone ?? "",
    address: detail.address ?? "",
  });
  const [suspendReason, setSuspendReason] = useState("");
  const [planId, setPlanId] = useState(detail.subscription?.planId ?? plans[0]?.id ?? "");
  const [trialDaysInput, setTrialDaysInput] = useState("");
  const [payment, setPayment] = useState({ amount: "", method: "CASH", reference: "", cycles: "1" });
  const [extend, setExtend] = useState({ days: "7", reason: "" });

  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, success: string) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        setDialog(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Action fail ho gaya.");
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Business info ── */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Business
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialog("edit")}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await impersonateTenantAction(t.id);
                  // On success the action redirects; only errors land here.
                  if (result && !result.ok) toast.error(result.error ?? "Login fail ho gaya.");
                })
              }
              disabled={pending}
            >
              <LogIn className="h-3.5 w-3.5 mr-1" /> Login as Tenant
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <StatusBadge kind={t.status === "ACTIVE" ? "active" : "danger"}>{t.status}</StatusBadge>
            {t.status === "SUSPENDED" && t.suspendedReason && (
              <span className="ml-2 text-xs text-muted-foreground">{t.suspendedReason}</span>
            )}
          </dd>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{t.phone ?? "—"}</dd>
          <dt className="text-muted-foreground">Address</dt>
          <dd>{detail.address ?? "—"}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{detail.businessType ?? "—"}</dd>
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{formatDate(t.createdAt)}</dd>
          <dt className="text-muted-foreground">Bills</dt>
          <dd>
            {detail.totalBills}
            {detail.lastSaleAt && (
              <span className="ml-1 text-xs text-muted-foreground">
                · last {formatDate(detail.lastSaleAt)}
              </span>
            )}
          </dd>
        </dl>
        <div>
          {t.status === "ACTIVE" ? (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => setDialog("suspend")}>
              <Ban className="h-3.5 w-3.5 mr-1" /> Suspend Tenant
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-700"
              disabled={pending}
              onClick={() => run(() => activateTenantAction(t.id), "Tenant activate ho gaya.")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate Tenant
            </Button>
          )}
        </div>
      </div>

      {/* ── Subscription ── */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Subscription
          </h2>
          <Button variant="outline" size="sm" onClick={() => setDialog("plan")}>
            {detail.subscription ? "Change Plan" : "Assign Plan"}
          </Button>
        </div>
        {detail.subscription ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{detail.subscription.planName}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge kind={SUB_BADGE[detail.subscription.status] ?? "neutral"}>
                  {detail.subscription.status}
                </StatusBadge>
              </dd>
              <dt className="text-muted-foreground">Coverage till</dt>
              <dd>
                {detail.subscription.effectiveUntil
                  ? formatDate(detail.subscription.effectiveUntil)
                  : "—"}
                {detail.subscription.daysLeft != null && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({detail.subscription.daysLeft}d)
                  </span>
                )}
              </dd>
              <dt className="text-muted-foreground">Trial ends</dt>
              <dd>
                {detail.subscription.trialEndsAt ? formatDate(detail.subscription.trialEndsAt) : "—"}
              </dd>
              <dt className="text-muted-foreground">Paid until</dt>
              <dd>{detail.subscription.paidUntil ? formatDate(detail.subscription.paidUntil) : "—"}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialog("payment")}>
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Record Payment
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDialog("extend")}>
                <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Extend (no payment)
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Koi subscription nahi — tenant unrestricted chal raha hai. Plan assign karein.
          </p>
        )}
      </div>

      {/* ── Payment ledger ── */}
      <div className="rounded-lg border bg-white lg:col-span-2">
        <div className="border-b px-4 py-3 text-sm font-semibold">Payment History</div>
        {detail.payments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Abhi koi payment record nahi hui.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell>
                    <MoneyDisplay value={p.amount} tone="received" />
                  </TableCell>
                  <TableCell className="text-sm">{p.method.replace("_", " ")}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                  </TableCell>
                  <TableCell className="text-sm">{p.reference ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.recordedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Members ── */}
      <div className="rounded-lg border bg-white lg:col-span-2">
        <div className="border-b px-4 py-3 text-sm font-semibold">Users ({detail.members.length})</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm font-medium">{m.name}</TableCell>
                <TableCell className="text-sm">{m.email}</TableCell>
                <TableCell className="text-sm">{m.role}</TableCell>
                <TableCell>
                  <StatusBadge kind={m.status === "ACTIVE" ? "active" : "inactive"}>
                    {m.status}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit dialog ── */}
      <Dialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Business Name</Label>
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Owner Name</Label>
              <Input
                value={edit.ownerName}
                onChange={(e) => setEdit({ ...edit, ownerName: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={edit.address}
                onChange={(e) => setEdit({ ...edit, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => run(() => updateTenantAction(t.id, edit), "Tenant update ho gaya.")}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suspend dialog ── */}
      <Dialog open={dialog === "suspend"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Tenant?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.name} ke tamam users login nahi kar sakenge jab tak activate na karein.
          </p>
          <div className="grid gap-1.5">
            <Label>Wajah (zaroori)</Label>
            <Textarea
              rows={2}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Payment overdue 30+ days"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !suspendReason.trim()}
              onClick={() =>
                run(() => suspendTenantAction(t.id, suspendReason), "Tenant suspend ho gaya.")
              }
            >
              {pending ? "…" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign plan dialog ── */}
      <Dialog open={dialog === "plan"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detail.subscription ? "Change Plan" : "Assign Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan select karein" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — Rs. {p.price} / {p.billingCycle.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!detail.subscription && (
              <div className="grid gap-1.5">
                <Label>Trial days (optional)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="e.g. 14"
                  value={trialDaysInput}
                  onChange={(e) => setTrialDaysInput(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !planId}
              onClick={() =>
                run(
                  () =>
                    assignPlanAction(
                      t.id,
                      planId,
                      trialDaysInput ? parseInt(trialDaysInput, 10) || undefined : undefined
                    ),
                  "Plan assign ho gaya."
                )
              }
            >
              {pending ? "…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record payment dialog ── */}
      <Dialog open={dialog === "payment"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment — {t.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Amount (Rs.)</Label>
                <Input
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Billing cycles</Label>
                <Input
                  inputMode="numeric"
                  value={payment.cycles}
                  onChange={(e) => setPayment({ ...payment, cycles: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select
                value={payment.method}
                onValueChange={(v) => setPayment({ ...payment, method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Reference (optional)</Label>
              <Input
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                placeholder="Transaction ID, slip #…"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Coverage current expiry se aage barhegi (ya aaj se, agar pehle hi expire ho chuki hai).
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !payment.amount}
              onClick={() => run(() => recordPaymentAction(t.id, payment), "Payment record ho gayi.")}
            >
              {pending ? "…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Extend dialog ── */}
      <Dialog open={dialog === "extend"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Subscription (no payment)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Days</Label>
              <Select value={extend.days} onValueChange={(v) => setExtend({ ...extend, days: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "7", "15", "30"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Wajah (zaroori)</Label>
              <Textarea
                rows={2}
                value={extend.reason}
                onChange={(e) => setExtend({ ...extend, reason: e.target.value })}
                placeholder="e.g. Goodwill — payment aaj sham tak aa jayegi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !extend.reason.trim()}
              onClick={() =>
                run(
                  () => extendSubscriptionAction(t.id, parseInt(extend.days, 10), extend.reason),
                  "Subscription extend ho gayi."
                )
              }
            >
              {pending ? "…" : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
