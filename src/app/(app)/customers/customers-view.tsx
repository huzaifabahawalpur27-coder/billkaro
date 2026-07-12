"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserRound, Plus, Pencil, BookOpenText, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { toast } from "sonner";
import { createCustomerAction, updateCustomerAction, setCustomerStatusAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/app/empty-state";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  creditLimit: string | null;
  currentBalance: string;
  status: string;
  lastTransactionAt: string | null;
  lastPaymentAt: string | null;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  notes: string;
  creditLimit: string;
}

const emptyForm: FormState = { name: "", phone: "", address: "", notes: "", creditLimit: "" };

export function CustomersView({
  rows,
  total,
  page,
  pageSize,
  can,
}: {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  can: { manage: boolean; viewLedger: boolean };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";

  function search(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set("q", value); else sp.delete("q");
    sp.delete("page");
    router.push(`/customers?${sp.toString()}`);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: CustomerRow) {
    setEditing(row);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      address: row.address ?? "",
      notes: row.notes ?? "",
      creditLimit: row.creditLimit ?? "",
    });
    setDialogOpen(true);
  }

  function submit() {
    const data = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
      creditLimit: form.creditLimit || null,
    };
    startTransition(async () => {
      const result = editing
        ? await updateCustomerAction(editing.id, data)
        : await createCustomerAction(data);
      if (result.ok) {
        toast.success(editing ? "Customer update ho gaya." : "Customer add ho gaya.");
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Kuch gadbad ho gayi.");
      }
    });
  }

  function toggleStatus(row: CustomerRow) {
    const active = row.status !== "ACTIVE";
    startTransition(async () => {
      const result = await setCustomerStatusAction(row.id, active);
      if (result.ok) {
        toast.success(active ? `${row.name} active ho gaya.` : `${row.name} inactive ho gaya.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Status update nahi ho saka.");
      }
    });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Naam ya phone se search…"
            defaultValue={q}
            onChange={(e) => search(e.target.value)}
          />
        </div>
        {can.manage && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Customer
          </Button>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Koi customer nahi"
          description={q ? "Search se koi customer nahi mila." : "Pehla customer add karein."}
          actions={can.manage ? (
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Udhaar Balance</TableHead>
                  <TableHead>Last Transaction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      {row.address && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.address}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.phone ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay
                        value={row.currentBalance}
                        tone={parseFloat(row.currentBalance) > 0 ? "due" : undefined}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastTransactionAt ? formatDate(row.lastTransactionAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
                        {row.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {can.viewLedger && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/khata/${row.id}`} title="Khata dekho">
                              <BookOpenText className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {can.manage && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleStatus(row)}
                              disabled={pending}
                              title={row.status === "ACTIVE" ? "Inactive karo" : "Active karo"}
                            >
                              {row.status === "ACTIVE" ? (
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-slate-400" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    {row.phone && <div className="text-[10px] text-slate-500 mt-0.5">{row.phone}</div>}
                  </div>
                  <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
                    {row.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {row.address && (
                  <p className="text-[10px] text-muted-foreground border-t border-slate-100 pt-1.5">{row.address}</p>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Udhaar</span>
                    <MoneyDisplay
                      value={row.currentBalance}
                      tone={parseFloat(row.currentBalance) > 0 ? "due" : undefined}
                      className="font-bold text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    {can.viewLedger && (
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" asChild>
                        <Link href={`/khata/${row.id}`}>Khata</Link>
                      </Button>
                    )}
                    {can.manage && (
                      <>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => toggleStatus(row)}
                          disabled={pending}
                        >
                          {row.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} customers</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page - 1));
                router.push(`/customers?${sp.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.set("page", String(page + 1));
                router.push(`/customers?${sp.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Customer Edit Karein" : "Naya Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Naam *</Label>
              <Input
                id="cust-name"
                placeholder="Customer ka naam"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                placeholder="0300-0000000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-address">Address</Label>
              <Input
                id="cust-address"
                placeholder="Ghar / dukan ka pata"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-credit">Credit Limit (optional)</Label>
              <Input
                id="cust-credit"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-notes">Notes</Label>
              <Textarea
                id="cust-notes"
                placeholder="Koi zaruri baat…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submit} disabled={pending || !form.name.trim()}>
                {pending ? "Saving…" : editing ? "Update" : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
