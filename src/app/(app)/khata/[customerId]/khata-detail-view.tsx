"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Banknote, SlidersHorizontal, Wallet,
  ReceiptText, ArrowUpCircle, ArrowDownCircle, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { receivePaymentAction, setOpeningBalanceAction, adjustBalanceAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LedgerEntryRow {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  invoiceNumber: string | null;
  saleId: string | null;
  createdByName: string;
  createdAt: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currentBalance: string;
}

const ENTRY_LABELS: Record<string, string> = {
  SALE_CREDIT: "Udhaar sale",
  PAYMENT_RECEIVED: "Payment received",
  OPENING_BALANCE: "Opening balance",
  POSITIVE_ADJUSTMENT: "Balance increase",
  NEGATIVE_ADJUSTMENT: "Balance decrease",
  SALE_CANCELLED_REVERSAL: "Bill cancelled",
};

export function KhataDetailView({
  customer,
  summary,
  entries,
  currencySymbol,
  businessName,
  can,
}: {
  customer: CustomerInfo;
  summary: { totalBilled: string; billCount: number; totalPaid: string };
  entries: LedgerEntryRow[];
  currencySymbol: string;
  businessName: string;
  can: { receivePayment: boolean; adjustLedger: boolean; viewBills: boolean };
}) {
  const router = useRouter();
  const [payDialog, setPayDialog] = useState(false);
  const [adjDialog, setAdjDialog] = useState(false);
  const [obDialog, setObDialog] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [adjType, setAdjType] = useState<"POSITIVE_ADJUSTMENT" | "NEGATIVE_ADJUSTMENT">("POSITIVE_ADJUSTMENT");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [obAmount, setObAmount] = useState("");

  const [pending, startTransition] = useTransition();
  const balance = parseFloat(customer.currentBalance);

  function sendWhatsAppReminder() {
    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, "") : "";
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith("0")) {
      formattedPhone = "92" + cleanPhone.slice(1);
    } else if (cleanPhone && !cleanPhone.startsWith("92")) {
      formattedPhone = "92" + cleanPhone;
    }

    const message = `Assalam-o-Alaikum, ${customer.name}.
    
Aap ka "${businessName}" par ${currencySymbol} ${Math.abs(balance).toLocaleString("en-PK")} ka pending udhaar khata baqi hai. Bara-e-meherbani jald az jald ada karein.

Shukriya,
${businessName}`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function handlePayment() {
    startTransition(async () => {
      const result = await receivePaymentAction(customer.id, {
        amount: payAmount,
        method: payMethod,
        reference: payRef || undefined,
      });
      if (result.ok && result.data) {
        toast.success(`Payment record ho gayi — ${result.data.receiptNumber}`);
        setPayDialog(false);
        setPayAmount("");
        setPayRef("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Payment nahi ho saki.");
      }
    });
  }

  function handleAdjustment() {
    startTransition(async () => {
      const result = await adjustBalanceAction(customer.id, adjType, adjAmount, adjNote);
      if (result.ok) {
        toast.success("Adjustment ho gayi.");
        setAdjDialog(false);
        setAdjAmount("");
        setAdjNote("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Adjustment nahi ho saki.");
      }
    });
  }

  function handleOpeningBalance() {
    startTransition(async () => {
      const result = await setOpeningBalanceAction(customer.id, obAmount);
      if (result.ok) {
        toast.success("Opening balance set ho gaya.");
        setObDialog(false);
        setObAmount("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Opening balance set nahi ho saka.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Back */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/khata">
            <ArrowLeft className="h-4 w-4 mr-1" /> Khata List
          </Link>
        </Button>
      </div>

      {/* Customer summary card */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Balance</p>
          <p className={cn("text-2xl font-bold mt-1", balance > 0 ? "text-red-600" : "text-emerald-600")}>
            {currencySymbol} {Math.abs(balance).toLocaleString("en-PK")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {balance > 0 ? "Inka udhaar baqi hai" : balance < 0 ? "Advance paid" : "Saaf khata"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Billed</p>
          <p className="text-xl font-semibold mt-1">
            <MoneyDisplay value={summary.totalBilled} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">{summary.billCount} bills</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Received</p>
          <p className="text-xl font-semibold mt-1 text-emerald-600">
            <MoneyDisplay value={summary.totalPaid} />
          </p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {can.receivePayment && balance > 0 && (
          <Button onClick={() => setPayDialog(true)}>
            <Banknote className="h-4 w-4 mr-1" /> Payment Lein
          </Button>
        )}
        {customer.phone && balance > 0 && (
          <Button
            variant="outline"
            className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/20"
            onClick={sendWhatsAppReminder}
          >
            <MessageSquare className="h-4 w-4 mr-1 text-emerald-600" /> WhatsApp Reminder
          </Button>
        )}
        {can.adjustLedger && (
          <>
            <Button variant="outline" onClick={() => setObDialog(true)}>
              <Wallet className="h-4 w-4 mr-1" /> Opening Balance
            </Button>
            <Button variant="outline" onClick={() => setAdjDialog(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Adjust Balance
            </Button>
          </>
        )}
        {can.viewBills && (
          <Button variant="outline" asChild>
            <Link href={`/bills?customer=${customer.id}`}>
              <ReceiptText className="h-4 w-4 mr-1" /> Bills Dekho
            </Link>
          </Button>
        )}
      </div>

      {/* Ledger history */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Ledger History
        </h2>
        {entries.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            Koi entry nahi hai abhi.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const amt = parseFloat(e.amount);
                    const isCredit = amt > 0;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {isCredit ? (
                              <ArrowUpCircle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {ENTRY_LABELS[e.type] ?? e.type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {e.description}
                          {e.invoiceNumber && e.saleId && can.viewBills && (
                            <Link
                              href={`/bills/${e.saleId}`}
                              className="ml-1 text-indigo-600 hover:underline text-xs"
                            >
                              ({e.invoiceNumber})
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono", isCredit ? "text-red-600" : "text-emerald-600")}>
                          {isCredit ? "+" : ""}{Math.abs(amt).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {parseFloat(e.balanceAfter).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(e.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {entries.map((e) => {
                const amt = parseFloat(e.amount);
                const isCredit = amt > 0;
                return (
                  <div key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        {isCredit ? (
                          <ArrowUpCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {ENTRY_LABELS[e.type] ?? e.type}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                    </div>

                    <p className="text-[11px] text-slate-600 border-t border-slate-100 pt-1.5">
                      {e.description}
                      {e.invoiceNumber && e.saleId && can.viewBills && (
                        <Link href={`/bills/${e.saleId}`} className="ml-1 text-indigo-600 hover:underline text-[10px]">
                          ({e.invoiceNumber})
                        </Link>
                      )}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-mono text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-sans">Amount</span>
                        <span className={isCredit ? "text-red-600" : "text-emerald-600"}>
                          {isCredit ? "+" : ""}{parseFloat(e.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-sans">Balance After</span>
                        <span className="text-slate-700 font-medium">
                          {parseFloat(e.balanceAfter).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Receive Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Payment Lein — {customer.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 500"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="Transaction ID, cheque #…"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handlePayment} disabled={pending || !payAmount}>
                {pending ? "Saving…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Opening Balance Dialog */}
      <Dialog open={obDialog} onOpenChange={setObDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Opening Balance Set Karein</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Yeh pichle udhaar ka initial balance set karega. Existing entries par asar nahi hoga.
            </p>
            <div className="space-y-1.5">
              <Label>Opening Balance Amount</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 2500"
                value={obAmount}
                onChange={(e) => setObAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setObDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleOpeningBalance} disabled={pending || !obAmount}>
                {pending ? "Saving…" : "Set Balance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog open={adjDialog} onOpenChange={setAdjDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Balance Adjust Karein</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjType("POSITIVE_ADJUSTMENT")}
                className={cn(
                  "flex items-center gap-1.5 justify-center rounded-md border px-3 py-2 text-sm font-medium",
                  adjType === "POSITIVE_ADJUSTMENT"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <ArrowUpCircle className="h-4 w-4" /> Increase
              </button>
              <button
                type="button"
                onClick={() => setAdjType("NEGATIVE_ADJUSTMENT")}
                className={cn(
                  "flex items-center gap-1.5 justify-center rounded-md border px-3 py-2 text-sm font-medium",
                  adjType === "NEGATIVE_ADJUSTMENT"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <ArrowDownCircle className="h-4 w-4" /> Decrease
              </button>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 100"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                placeholder="Kyu adjust kar rahe hain…"
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAdjDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAdjustment} disabled={pending || !adjAmount}>
                {pending ? "Saving…" : "Apply Adjustment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
