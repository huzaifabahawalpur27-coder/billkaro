"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Wand2, Copy, CheckCircle2 } from "lucide-react";
import { createTenantAction } from "./actions";
import { generatePassword } from "@/lib/generate-password";
import type { PlanRow } from "@/server/services/platform/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const NO_PLAN = "__none__";

interface Form {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  planId: string;
  trialDays: string;
}

const EMPTY: Form = {
  businessName: "",
  ownerName: "",
  email: "",
  password: "",
  phone: "",
  planId: NO_PLAN,
  trialDays: "14",
};

export function CreateTenantDialog({ plans }: { plans: PlanRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();
  // Show-once credentials after success; dialog closes only via its button.
  const [created, setCreated] = useState<{
    email: string;
    password: string;
    attachedExistingUser: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const close = () => {
    setOpen(false);
    setForm(EMPTY);
    setCreated(null);
    setCopied(false);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createTenantAction({
        businessName: form.businessName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        planId: form.planId === NO_PLAN ? "" : form.planId,
        trialDays:
          form.planId !== NO_PLAN && form.trialDays ? Number(form.trialDays) : undefined,
      });
      if (result.ok) {
        setCreated({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          attachedExistingUser: result.attachedExistingUser ?? false,
        });
        router.refresh();
      } else {
        toast.error(result.error ?? "Tenant create nahi ho saka.");
      }
    });
  };

  const copyCredentials = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Tenant
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && !created && close()}>
        <DialogContent
          className="sm:max-w-md"
          // While showing credentials, block accidental dismissal.
          onInteractOutside={(e) => created && e.preventDefault()}
          onEscapeKeyDown={(e) => created && e.preventDefault()}
          showCloseButton={!created}
        >
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Tenant ban gaya
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {created.attachedExistingUser ? (
                  <p className="rounded-md bg-amber-50 border border-amber-200 p-2.5">
                    Is email ka account pehle se tha — usay Owner bana diya gaya hai.
                    <strong> Password change NAHI hua</strong>; user apna purana password use karega.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Yeh credentials sirf ab dikhengi — copy kar ke shopkeeper ko dein.
                  </p>
                )}
                <div className="rounded-md border bg-slate-50 p-3 font-mono text-sm space-y-1">
                  <div>Email: {created.email}</div>
                  {!created.attachedExistingUser && <div>Password: {created.password}</div>}
                </div>
                <div className="flex gap-2">
                  {!created.attachedExistingUser && (
                    <Button variant="outline" size="sm" onClick={copyCredentials}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> {copied ? "Copied!" : "Copy"}
                    </Button>
                  )}
                  <Button size="sm" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New Tenant</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label>Shop / Business Name</Label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => set({ businessName: e.target.value })}
                    placeholder="e.g. Madina General Store"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Owner Name</Label>
                    <Input
                      value={form.ownerName}
                      onChange={(e) => set({ ownerName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Owner Email (login)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    placeholder="owner@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Agar account pehle se hai to woh is shop ka Owner ban jayega (password wohi rahega).
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label>Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.password}
                      onChange={(e) => set({ password: e.target.value })}
                      placeholder="Kam az kam 8 characters"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => set({ password: generatePassword() })}
                    >
                      <Wand2 className="h-3.5 w-3.5 mr-1" /> Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Plan (optional)</Label>
                    <Select value={form.planId} onValueChange={(v) => set({ planId: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PLAN}>No plan (unrestricted)</SelectItem>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — Rs. {p.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.planId !== NO_PLAN && (
                    <div className="grid gap-1.5">
                      <Label>Trial days</Label>
                      <Input
                        inputMode="numeric"
                        value={form.trialDays}
                        onChange={(e) => set({ trialDays: e.target.value })}
                        placeholder="14"
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={submit}
                  disabled={
                    pending ||
                    form.businessName.trim().length < 2 ||
                    form.ownerName.trim().length < 2 ||
                    !form.email.includes("@") ||
                    form.password.length < 8
                  }
                >
                  {pending ? "Creating…" : "Create Tenant"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
