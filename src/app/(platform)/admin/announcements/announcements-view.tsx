"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";
import { createAnnouncementAction, setAnnouncementActiveAction } from "./actions";
import type { AnnouncementRow } from "@/server/services/platform/announcements";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/format";

const ALL = "__all__";

const TYPE_BADGE: Record<string, StatusKind> = {
  INFO: "neutral",
  WARNING: "warning",
  URGENT: "danger",
};

interface Form {
  title: string;
  body: string;
  type: string;
  targetBusinessId: string;
  expiresInDays: string;
}

const EMPTY: Form = { title: "", body: "", type: "INFO", targetBusinessId: ALL, expiresInDays: "" };

export function AnnouncementsView({
  announcements,
  tenants,
}: {
  announcements: AnnouncementRow[];
  tenants: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    startTransition(async () => {
      const result = await createAnnouncementAction({
        title: form.title,
        body: form.body,
        type: form.type,
        targetBusinessId: form.targetBusinessId === ALL ? "" : form.targetBusinessId,
        expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined,
      });
      if (result.ok) {
        toast.success("Announcement bhej diya gaya.");
        setOpen(false);
        setForm(EMPTY);
        router.refresh();
      } else {
        toast.error(result.error ?? "Create nahi ho saka.");
      }
    });
  };

  const toggleActive = (id: string, active: boolean) => {
    startTransition(async () => {
      const result = await setAnnouncementActiveAction(id, active);
      if (result.ok) {
        toast.success(active ? "Announcement wapas active ho gaya." : "Announcement band ho gaya.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Update fail ho gaya.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Koi announcement nahi"
          description="Pehla message bhejein — tenants ko toast aur bell mein milega."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.title}</span>
                    <StatusBadge kind={TYPE_BADGE[a.type] ?? "neutral"}>{a.type}</StatusBadge>
                    {!a.isActive && <StatusBadge kind="inactive">OFF</StatusBadge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {a.targetName ? `Target: ${a.targetName}` : "Sab tenants"} · {a.seenCount} ne
                    dekha · {a.createdBy} · {formatDate(a.createdAt)}
                    {a.expiresAt && ` · expires ${formatDate(a.expiresAt)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => toggleActive(a.id, !a.isActive)}
                >
                  {a.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Renewal reminder"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Message</Label>
              <Textarea
                rows={3}
                value={form.body}
                onChange={(e) => set({ body: e.target.value })}
                placeholder="Shopkeepers ko kya batana hai…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set({ type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Expires (days, optional)</Label>
                <Input
                  inputMode="numeric"
                  value={form.expiresInDays}
                  onChange={(e) => set({ expiresInDays: e.target.value })}
                  placeholder="e.g. 7"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Target</Label>
              <Select
                value={form.targetBusinessId}
                onValueChange={(v) => set({ targetBusinessId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Sab tenants (broadcast)</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={submit}
              disabled={pending || form.title.trim().length < 3 || form.body.trim().length < 3}
            >
              {pending ? "Sending…" : "Send Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
