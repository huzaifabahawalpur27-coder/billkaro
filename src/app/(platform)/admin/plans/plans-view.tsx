"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Layers } from "lucide-react";
import { savePlanAction } from "./actions";
import type { PlanRow } from "@/server/services/platform/plans";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CYCLES = [
  ["MONTHLY", "Monthly"],
  ["QUARTERLY", "Quarterly"],
  ["YEARLY", "Yearly"],
  ["LIFETIME", "Lifetime (one-time)"],
] as const;

interface PlanForm {
  name: string;
  price: string;
  billingCycle: string;
  maxUsers: string;
  maxProducts: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: PlanForm = {
  name: "",
  price: "",
  billingCycle: "MONTHLY",
  maxUsers: "",
  maxProducts: "",
  sortOrder: "0",
  isActive: true,
};

export function PlansView({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null | false>(false); // false=closed, null=new, id=edit
  const [form, setForm] = useState<PlanForm>(EMPTY);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    setForm(EMPTY);
    setEditing(null);
  };
  const openEdit = (p: PlanRow) => {
    setForm({
      name: p.name,
      price: p.price,
      billingCycle: p.billingCycle,
      maxUsers: p.maxUsers?.toString() ?? "",
      maxProducts: p.maxProducts?.toString() ?? "",
      sortOrder: p.sortOrder.toString(),
      isActive: p.isActive,
    });
    setEditing(p.id);
  };

  const save = () => {
    startTransition(async () => {
      const result = await savePlanAction(editing === null ? null : (editing as string), {
        name: form.name,
        price: form.price,
        billingCycle: form.billingCycle,
        maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
        maxProducts: form.maxProducts ? Number(form.maxProducts) : null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });
      if (result.ok) {
        toast.success("Plan save ho gaya.");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save nahi ho saka.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> New Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Koi plan nahi"
          description="Pehla subscription plan banayein — naye signups is par trial shuru karenge."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border bg-white p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-2xl font-bold mt-1">
                    <MoneyDisplay value={p.price} />
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / {p.billingCycle.toLowerCase()}
                    </span>
                  </div>
                </div>
                <StatusBadge kind={p.isActive ? "active" : "inactive"}>
                  {p.isActive ? "Active" : "Off"}
                </StatusBadge>
              </div>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                <li>Users: {p.maxUsers ?? "Unlimited"}</li>
                <li>Products: {p.maxProducts ?? "Unlimited"}</li>
                <li>{p.subscriberCount} subscriber{p.subscriberCount === 1 ? "" : "s"}</li>
              </ul>
              <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== false} onOpenChange={(o) => !o && setEditing(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === null ? "New Plan" : "Edit Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Basic"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Price (Rs.)</Label>
                <Input
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="1500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Billing cycle</Label>
                <Select
                  value={form.billingCycle}
                  onValueChange={(v) => setForm({ ...form, billingCycle: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Max users (khali = unlimited)</Label>
                <Input
                  inputMode="numeric"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Max products</Label>
                <Input
                  inputMode="numeric"
                  value={form.maxProducts}
                  onChange={(e) => setForm({ ...form, maxProducts: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive plans naye assignments ke liye hide ho jate hain.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={pending || !form.name.trim() || !form.price.trim()} onClick={save}>
              {pending ? "Saving…" : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
