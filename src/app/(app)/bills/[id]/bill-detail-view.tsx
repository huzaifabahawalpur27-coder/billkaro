"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, XCircle, ArrowLeft, ChevronRight, Undo2 } from "lucide-react";
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

export interface OriginalSaleItem {
  productId: string | null;
  name: string;
  soldPrice: string;
  quantity: string;
  isOpenItem: boolean;
}

export interface OriginalSaleSnapshot {
  id: string;
  invoiceNumber: string;
  grandTotal: string;
  items: OriginalSaleItem[];
}

export function BillDetailView({
  sale,
  originalSaleSnapshot = null,
  canCancel,
  currencySymbol,
  business,
  footer,
}: {
  sale: SaleDetail;
  originalSaleSnapshot?: OriginalSaleSnapshot | null;
  canCancel: boolean;
  currencySymbol: string;
  business: { name: string; address: string | null; phone: string | null };
  footer: string;
}) {
  const router = useRouter();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  // Compute Returned and Exchanged Items
  const returnedItems = [];
  const addedItems = [];

  if (originalSaleSnapshot) {
    // 1. Find Returned Items (in original, but decreased/removed in revised)
    for (const orig of originalSaleSnapshot.items) {
      const curr = sale.items.find((i) =>
        orig.productId
          ? i.sku === orig.productId || i.id === orig.productId || i.name === orig.name
          : i.name === orig.name
      );
      const origQty = parseFloat(orig.quantity);
      const currQty = curr ? parseFloat(curr.quantity) : 0;
      const returnedQty = origQty - currQty;
      if (returnedQty > 0) {
        returnedItems.push({
          name: orig.name,
          quantity: returnedQty,
          soldPrice: orig.soldPrice,
          totalRefund: returnedQty * parseFloat(orig.soldPrice),
        });
      }
    }

    // 2. Find Added Items (in revised, but not in original or increased)
    for (const curr of sale.items) {
      const orig = originalSaleSnapshot.items.find((i) =>
        curr.sku
          ? i.productId === curr.sku || i.productId === curr.id || i.name === curr.name
          : i.name === curr.name
      );
      const currQty = parseFloat(curr.quantity);
      const origQty = orig ? parseFloat(orig.quantity) : 0;
      const addedQty = currQty - origQty;
      if (addedQty > 0) {
        addedItems.push({
          name: curr.name,
          quantity: addedQty,
          soldPrice: curr.soldPrice,
          totalCost: addedQty * parseFloat(curr.soldPrice),
        });
      }
    }
  }

  const totalReturned = returnedItems.reduce((acc, i) => acc + i.totalRefund, 0);
  const totalAdded = addedItems.reduce((acc, i) => acc + i.totalCost, 0);

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
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/bills" className="hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Bills
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono">{sale.invoiceNumber}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <a href={`/bills/${sale.id}/print`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Receipt
            </a>
          </Button>
          {!isCancelled && (
            <Button variant="outline" size="sm" asChild className="h-8 text-xs border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350">
              <Link href={`/bill?edit=${sale.id}`}>
                <Undo2 className="h-3.5 w-3.5 mr-1.5 text-indigo-650" /> Modify / Return Items
              </Link>
            </Button>
          )}
          {canCancel && !isCancelled && (
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => setCancelDialog(true)}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Cancel Bill
            </Button>
          )}
        </div>
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

      {/* Return & Exchange Summary Panel */}
      {originalSaleSnapshot && (returnedItems.length > 0 || addedItems.length > 0) && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/20 dark:border-indigo-950/25 space-y-3 print:border print:border-slate-350 print:bg-white print:p-3 print:text-black">
          <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-100/60 dark:border-indigo-900/50 print:border-b-black print:pb-1">
            <Undo2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 print:text-black shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider text-[11px]">
              Return & Exchange Summary (Wapsi detail)
            </span>
            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-mono print:text-black">
              Original Ref: {originalSaleSnapshot.invoiceNumber}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            {/* Left Column: Returned Items */}
            {returnedItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-red-600 dark:text-red-400 uppercase tracking-wide text-[9.5px] block">
                  Wapas kiyay huay items (Returned)
                </span>
                <ul className="space-y-1">
                  {returnedItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-slate-650 dark:text-slate-350 print:text-black font-medium">
                      <span className="truncate max-w-[160px]">{item.name} <span className="text-[10px] text-slate-400">({item.quantity} pcs)</span></span>
                      <span className="text-red-650 dark:text-red-450 font-mono font-semibold print:text-black">
                        -{currencySymbol} {item.totalRefund.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Right Column: Added Items */}
            {addedItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-bold text-emerald-650 dark:text-emerald-400 uppercase tracking-wide text-[9.5px] block">
                  Naye khridi huay items (Exchanged)
                </span>
                <ul className="space-y-1">
                  {addedItems.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-slate-650 dark:text-slate-350 print:text-black font-medium">
                      <span className="truncate max-w-[160px]">{item.name} <span className="text-[10px] text-slate-400">({item.quantity} pcs)</span></span>
                      <span className="text-emerald-650 dark:text-emerald-450 font-mono font-semibold print:text-black">
                        +{currencySymbol} {item.totalCost.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2.5 border-t border-indigo-100/60 dark:border-indigo-900/50 print:border-t-black font-bold">
            <span className="text-slate-700 dark:text-slate-300 print:text-black text-xs">
              Adjustment Total ({totalAdded >= totalReturned ? "Customer paid" : "Shopkeeper returned"})
            </span>
            <span className={cn(
              "text-sm font-extrabold font-mono",
              totalAdded >= totalReturned ? "text-emerald-650 dark:text-emerald-400" : "text-red-650 dark:text-red-400",
              "print:text-black"
            )}>
              {totalAdded >= totalReturned ? "+" : "-"}{currencySymbol} {Math.abs(totalAdded - totalReturned).toFixed(0)}
            </span>
          </div>
        </div>
      )}

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
