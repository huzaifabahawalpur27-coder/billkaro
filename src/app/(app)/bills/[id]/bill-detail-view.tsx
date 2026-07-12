"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, XCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cancelBillAction } from "../../khata/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SaleItem {
  id: string;
  name: string;
  sku: string | null;
  cataloguePrice: string | null;
  soldPrice: string;
  quantity: string;
  lineTotal: string;
  isOpenItem: boolean;
}

interface SalePayment {
  id: string;
  amount: string;
  method: string;
  receiptNumber: string | null;
  receivedByName: string;
  paymentDate: string;
}

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  grandTotal: string;
  amountPaid: string;
  amountDue: string;
  cashReceived: string | null;
  changeDue: string | null;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  taxRate: string;
  notes: string | null;
  cashierName: string;
  cancelledAt: string | null;
  cancelledByName: string | null;
  cancelReason: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  items: SaleItem[];
  payments: SalePayment[];
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  UDHAAR: "bg-red-100 text-red-800",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT: "Credit / Udhaar",
  OTHER: "Other",
};

export function BillDetailView({
  sale,
  canCancel,
  currencySymbol,
  business,
  footer,
}: {
  sale: SaleDetail;
  canCancel: boolean;
  currencySymbol: string;
  business: { name: string; address: string | null; phone: string | null };
  footer: string;
}) {
  const router = useRouter();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBillAction(sale.id, reason, sale.customer?.id ?? null);
      if (result.ok) {
        toast.success("Bill cancel ho gaya.");
        setCancelDialog(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Cancel nahi ho saka.");
      }
    });
  }

  const isCancelled = sale.status === "CANCELLED";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/bills" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Bills
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-mono">{sale.invoiceNumber}</span>
      </div>

      {/* Header card */}
      <div className="rounded-lg border p-5 space-y-3 print:border-0">
        {/* Business */}
        <div className="text-center border-b pb-3">
          <h1 className="text-xl font-bold">{business.name}</h1>
          {business.address && <p className="text-xs text-muted-foreground">{business.address}</p>}
          {business.phone && <p className="text-xs text-muted-foreground">{business.phone}</p>}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Invoice #</p>
            <p className="font-mono font-bold text-lg">{sale.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(sale.createdAt)}</p>
          </div>
          <div className="text-right space-y-1">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                isCancelled ? "bg-slate-100 text-slate-500" : STATUS_COLORS[sale.paymentStatus]
              )}
            >
              {isCancelled ? "CANCELLED" : sale.paymentStatus}
            </span>
          </div>
        </div>

        {sale.customer && (
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Customer: </span>
            <Link href={`/khata/${sale.customer.id}`} className="font-medium hover:underline text-indigo-700">
              {sale.customer.name}
            </Link>
            {sale.customer.phone && <span className="text-muted-foreground ml-2">({sale.customer.phone})</span>}
          </div>
        )}

        {isCancelled && sale.cancelledAt && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            Cancelled on {formatDateTime(sale.cancelledAt)}
            {sale.cancelledByName && ` by ${sale.cancelledByName}`}
            {sale.cancelReason && ` — "${sale.cancelReason}"`}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Item</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{item.name}</div>
                  {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                  {item.isOpenItem && <div className="text-xs text-amber-600">Open item</div>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{parseFloat(item.quantity).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <MoneyDisplay value={item.soldPrice} symbol={currencySymbol} />
                  {item.cataloguePrice && item.soldPrice !== item.cataloguePrice && (
                    <div className="text-xs text-muted-foreground line-through">
                      <MoneyDisplay value={item.cataloguePrice} symbol={currencySymbol} />
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                  <MoneyDisplay value={item.lineTotal} symbol={currencySymbol} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="rounded-lg border p-4 space-y-2 max-w-xs ml-auto">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <MoneyDisplay value={sale.subtotal} symbol={currencySymbol} />
        </div>
        {parseFloat(sale.discountAmount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <MoneyDisplay value={`-${sale.discountAmount}`} symbol={currencySymbol} />
          </div>
        )}
        {parseFloat(sale.taxAmount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({sale.taxRate}%)</span>
            <MoneyDisplay value={sale.taxAmount} symbol={currencySymbol} />
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <MoneyDisplay value={sale.grandTotal} symbol={currencySymbol} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Received</span>
          <MoneyDisplay value={sale.amountPaid} symbol={currencySymbol} tone="received" />
        </div>
        {parseFloat(sale.amountDue) > 0 && (
          <div className="flex justify-between text-sm font-medium">
            <span className="text-red-600">Udhaar</span>
            <MoneyDisplay value={sale.amountDue} symbol={currencySymbol} tone="due" />
          </div>
        )}
        {sale.changeDue && parseFloat(sale.changeDue) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Change</span>
            <MoneyDisplay value={sale.changeDue} symbol={currencySymbol} tone="received" />
          </div>
        )}
        <div className="flex justify-between text-xs text-muted-foreground pt-1">
          <span>Payment method</span>
          <span>{METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
        </div>
      </div>

      {/* Footer for print */}
      <p className="text-center text-xs text-muted-foreground">{footer}</p>
      <p className="text-center text-xs text-muted-foreground">Cashier: {sale.cashierName}</p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" asChild>
          <a href={`/bills/${sale.id}/print`} target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4 mr-1" /> Print Receipt
          </a>
        </Button>
        {canCancel && !isCancelled && (
          <Button variant="destructive" onClick={() => setCancelDialog(true)}>
            <XCircle className="h-4 w-4 mr-1" /> Cancel Bill
          </Button>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bill Cancel Karein?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{sale.invoiceNumber}</span> cancel ho jayega.
              {parseFloat(sale.amountDue) > 0 && (
                <span> Udhaar ({currencySymbol} {parseFloat(sale.amountDue).toFixed(2)}) bhi wapas ho jayega.</span>
              )}
              {" "}Yeh action wapas nahi hota.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason">Wajah (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Cancel karne ki wajah…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelDialog(false)}>
                Wapas jao
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={pending}>
                {pending ? "Cancelling…" : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
