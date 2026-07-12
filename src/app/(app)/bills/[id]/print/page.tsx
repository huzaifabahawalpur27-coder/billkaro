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
  const { sale, settings, business } = await getBill(id);

  const sym = settings.currencySymbol;
  const size = settings.receiptSize; // THERMAL_58, THERMAL_80, A4

  return (
    <div className="bg-white text-black p-4 max-w-[80mm] mx-auto print:max-w-none font-mono text-xs">
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
