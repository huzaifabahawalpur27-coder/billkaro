import { getBill } from "@/server/services/bills";
import { requireBusiness } from "@/server/auth/guards";
import { MoneyDisplay } from "@/components/app/money-display";
import { formatDateTime } from "@/lib/format";
import { PrintLayoutTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function BillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireBusiness();
  const { sale, settings, business, originalSaleSnapshot } = await getBill(id);

  const sym = settings.currencySymbol;
  const size = settings.receiptSize; // THERMAL_58, THERMAL_80, A4

  const returnedItems = [];
  const addedItems = [];

  if (originalSaleSnapshot) {
    for (const orig of originalSaleSnapshot.items) {
      const curr = sale.items.find((i: any) =>
        orig.productId
          ? i.productId === orig.productId || i.id === orig.productId || i.productNameSnapshot === orig.name
          : i.productNameSnapshot === orig.name
      );
      const origQty = parseFloat(orig.quantity.toString());
      const currQty = curr ? parseFloat(curr.quantity.toString()) : 0;
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

    for (const curr of sale.items) {
      const orig = originalSaleSnapshot.items.find((i: any) =>
        curr.productId
          ? i.productId === curr.productId || i.productId === curr.id || i.name === curr.productNameSnapshot
          : i.name === curr.productNameSnapshot
      );
      const currQty = parseFloat(curr.quantity.toString());
      const origQty = orig ? parseFloat(orig.quantity.toString()) : 0;
      const addedQty = currQty - origQty;
      if (addedQty > 0) {
        addedItems.push({
          name: curr.productNameSnapshot,
          quantity: addedQty,
          soldPrice: curr.soldPrice.toString(),
          totalCost: addedQty * parseFloat(curr.soldPrice.toString()),
        });
      }
    }
  }

  const totalReturned = returnedItems.reduce((acc, i: any) => acc + i.totalRefund, 0);
  const totalAdded = addedItems.reduce((acc, i: any) => acc + i.totalCost, 0);

  if (size === "A4") {
    return (
      <div className="bg-slate-50 min-h-screen py-8 print:py-0 print:bg-white font-sans text-slate-800">
        <PrintLayoutTrigger />
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-12 border shadow-sm print:shadow-none print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-8">
            <div className="space-y-2">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-md bg-indigo-600 text-base font-bold text-white">
                    BK
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">BillKaro</span>
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-900 mt-2">{business.name}</h1>
              {business.address && <p className="text-sm text-slate-500 max-w-sm">{business.address}</p>}
              {business.phone && <p className="text-sm text-slate-500">Ph: {business.phone}</p>}
            </div>
            
            <div className="text-right space-y-2">
              <h2 className="text-3xl font-extrabold tracking-wider text-slate-400">INVOICE</h2>
              <div className="text-sm space-y-1">
                <p><span className="text-slate-400">Invoice No:</span> <span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span></p>
                <p><span className="text-slate-400">Date:</span> <span>{new Date(sale.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</span></p>
                <p><span className="text-slate-400">Payment:</span> <span className="font-semibold">{sale.paymentStatus}</span></p>
                <p><span className="text-slate-400">Method:</span> <span className="font-semibold">{sale.paymentMethod}</span></p>
              </div>
            </div>
          </div>

          {/* Customer / Cashier Section */}
          <div className="grid grid-cols-2 gap-8 my-8 text-sm">
            {sale.customer && (
              <div className="space-y-1">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Bill To</h3>
                <p className="font-bold text-slate-900">{sale.customer.name}</p>
                {sale.customer.phone && <p className="text-slate-500">Ph: {sale.customer.phone}</p>}
              </div>
            )}
            <div className="space-y-1 text-right">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400">Issued By</h3>
              <p className="font-bold text-slate-900">{business.name}</p>
              <p className="text-slate-500">Cashier: {sale.cashier.name}</p>
            </div>
          </div>

          {/* Return & Exchange Summary (A4) */}
          {originalSaleSnapshot && (returnedItems.length > 0 || addedItems.length > 0) && (
            <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 my-6 text-xs space-y-3 print:bg-white print:border-black">
              <div className="flex justify-between border-b pb-1 font-bold">
                <span className="text-slate-800 print:text-black">Return & Exchange Summary</span>
                <span className="font-mono text-slate-500 print:text-black">Original Ref: {originalSaleSnapshot.invoiceNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {returnedItems.length > 0 && (
                  <div>
                    <span className="font-bold text-red-655 block mb-1">Returned Items:</span>
                    <ul className="space-y-0.5 text-slate-600 print:text-black">
                      {returnedItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.name} ({item.quantity} pcs)</span>
                          <span className="font-mono font-semibold text-red-600 print:text-black">-{sym} {item.totalRefund.toLocaleString("en-PK")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {addedItems.length > 0 && (
                  <div>
                    <span className="font-bold text-emerald-655 block mb-1">Exchanged Items:</span>
                    <ul className="space-y-0.5 text-slate-600 print:text-black">
                      {addedItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.name} ({item.quantity} pcs)</span>
                          <span className="font-mono font-semibold text-emerald-600 print:text-black">+{sym} {item.totalCost.toLocaleString("en-PK")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-slate-800 print:text-black border-slate-200">
                <span>Net Adjustment ({totalAdded >= totalReturned ? "Customer Paid" : "Shopkeeper Refunded"}):</span>
                <span className={totalAdded >= totalReturned ? "text-emerald-600 print:text-black" : "text-red-600 print:text-black"}>
                  {totalAdded >= totalReturned ? "+" : "-"}{sym} {Math.abs(totalAdded - totalReturned).toLocaleString("en-PK")}
                </span>
              </div>
            </div>
          )}

          {/* Table */}
          <table className="w-full text-left my-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-semibold uppercase text-slate-400">
                <th className="py-3">Item Description</th>
                <th className="py-3 text-right">Qty</th>
                <th className="py-3 text-right">Rate</th>
                <th className="py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 font-medium text-slate-900">{item.productNameSnapshot}</td>
                  <td className="py-4 text-right font-mono">{parseFloat(item.quantity.toString())}</td>
                  <td className="py-4 text-right font-mono">{sym} {parseFloat(item.soldPrice.toString()).toLocaleString("en-PK")}</td>
                  <td className="py-4 text-right font-mono font-bold text-slate-900">{sym} {parseFloat(item.lineTotal.toString()).toLocaleString("en-PK")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Totals */}
          <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
            <div className="w-80 text-sm space-y-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{sym} {parseFloat(sale.subtotal.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(sale.discountAmount.toString()) > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-{sym} {parseFloat(sale.discountAmount.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {parseFloat(sale.taxAmount.toString()) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({sale.taxRate.toString()}%):</span>
                  <span className="font-mono">{sym} {parseFloat(sale.taxAmount.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-3 text-slate-900 border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono">{sym} {parseFloat(sale.grandTotal.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid Amount:</span>
                <span className="font-mono">{sym} {parseFloat(sale.amountPaid.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(sale.amountDue.toString()) > 0 && (
                <div className="flex justify-between text-red-600 font-bold border-t border-dotted pt-2 border-red-200">
                  <span>Balance Due (Udhaar):</span>
                  <span className="font-mono">{sym} {parseFloat(sale.amountDue.toString()).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-16 pt-8 border-t border-slate-100 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">{settings.invoiceFooter || "Thank You For Your Business!"}</p>
            <p>Powered by BillKaro · Made in 🇵🇰</p>
          </div>
        </div>
      </div>
    );
  }

  const maxWidthClass = size === "THERMAL_58" ? "max-w-[58mm]" : "max-w-[80mm]";

  return (
    <div className={`bg-white text-black p-4 ${maxWidthClass} mx-auto print:max-w-none font-mono text-xs`}>
      <PrintLayoutTrigger />
      
      {/* Header */}
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
        <h1 className="text-base font-bold uppercase">{business.name}</h1>
        {business.address && <p className="text-[10px] leading-tight">{business.address}</p>}
        {business.phone && <p className="text-[10px]">Ph: {business.phone}</p>}
      </div>

      {/* Bill Meta */}
      <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Bill No:</span>
          <span className="font-bold">{sale.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier:</span>
          <span>{sale.cashier.name}</span>
        </div>
        {sale.customer && (
          <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
            <span>Customer:</span>
            <span>{sale.customer.name}</span>
          </div>
        )}
      </div>

      {/* Return & Exchange Summary (Thermal) */}
      {originalSaleSnapshot && (returnedItems.length > 0 || addedItems.length > 0) && (
        <div className="py-2 text-[10px] space-y-1 border-b border-dashed border-black">
          <div className="font-bold uppercase flex justify-between">
            <span>Exchange Summary</span>
            <span className="font-mono">Ref: {originalSaleSnapshot.invoiceNumber}</span>
          </div>
          {returnedItems.length > 0 && (
            <div>
              <span className="font-semibold text-red-750 block text-[9px] uppercase tracking-wide">Returned:</span>
              {returnedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between pl-1">
                  <span className="truncate max-w-[140px]">• {item.name} (x{item.quantity})</span>
                  <span>-{sym}{item.totalRefund.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          {addedItems.length > 0 && (
            <div>
              <span className="font-semibold text-emerald-750 block text-[9px] uppercase tracking-wide">Exchanged:</span>
              {addedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between pl-1">
                  <span className="truncate max-w-[140px]">• {item.name} (x{item.quantity})</span>
                  <span>+{sym}{item.totalCost.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
            <span>Adjustment Net:</span>
            <span>
              {totalAdded >= totalReturned ? "+" : "-"}{sym}{Math.abs(totalAdded - totalReturned).toFixed(0)}
            </span>
          </div>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full text-left my-2 text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-black font-bold">
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Rate</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dotted divide-black">
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td className="py-1 max-w-[120px] truncate">{item.productNameSnapshot}</td>
              <td className="py-1 text-right">{parseFloat(item.quantity.toString())}</td>
              <td className="py-1 text-right">{parseFloat(item.soldPrice.toString()).toFixed(0)}</td>
              <td className="py-1 text-right font-bold">{parseFloat(item.lineTotal.toString()).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary / Totals */}
      <div className="border-t border-black pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{sym} {parseFloat(sale.subtotal.toString()).toFixed(2)}</span>
        </div>
        {parseFloat(sale.discountAmount.toString()) > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{sym} {parseFloat(sale.discountAmount.toString()).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(sale.taxAmount.toString()) > 0 && (
          <div className="flex justify-between">
            <span>Tax ({sale.taxRate.toString()}%):</span>
            <span>{sym} {parseFloat(sale.taxAmount.toString()).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1">
          <span>Grand Total:</span>
          <span>{sym} {parseFloat(sale.grandTotal.toString()).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid Amount:</span>
          <span>{sym} {parseFloat(sale.amountPaid.toString()).toFixed(2)}</span>
        </div>
        {parseFloat(sale.amountDue.toString()) > 0 && (
          <div className="flex justify-between text-red-700 font-bold">
            <span>Balance Due (Udhaar):</span>
            <span>{sym} {parseFloat(sale.amountDue.toString()).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Footer message */}
      <div className="text-center pt-4 mt-4 border-t border-dashed border-black space-y-1 text-[10px]">
        <p className="font-bold">{settings.invoiceFooter || "Thank You For Your Business!"}</p>
        <p className="text-[9px] text-gray-500">Powered by BillKaro</p>
      </div>
    </div>
  );
}
