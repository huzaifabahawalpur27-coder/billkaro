import { notFound } from "next/navigation";
import { getQuotation } from "@/server/services/quotations";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import { PrintLayoutTrigger } from "@/app/(app)/bills/[id]/print/print-trigger";

export const dynamic = "force-dynamic";

export default async function QuotationPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getQuotation(id);
  if (!result || !result.settings.quotationsEnabled) notFound();
  const { quotation, displayStatus, settings, business } = result;

  const sym = settings.currencySymbol;
  const toNum = (v: { toString(): string }) => parseFloat(v.toString());

  return (
    <div className="bg-white text-black p-4 max-w-[80mm] mx-auto print:max-w-none font-mono text-xs">
      <PrintLayoutTrigger />

      {/* Header */}
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
        <h1 className="text-base font-bold uppercase">{business.name}</h1>
        {business.address && <p className="text-[10px] leading-tight">{business.address}</p>}
        {business.phone && <p className="text-[10px]">Ph: {business.phone}</p>}
      </div>

      {/* Quotation banner — this is NOT a bill */}
      <div className="py-2 text-center border-b border-dashed border-black">
        <p className="text-sm font-bold tracking-widest">*** QUOTATION ***</p>
        <p className="text-[10px] font-bold">Yeh bill nahi hai — sirf rate estimate hai</p>
        {displayStatus === "EXPIRED" && (
          <p className="text-[10px] font-bold">(EXPIRED)</p>
        )}
      </div>

      {/* Meta */}
      <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Quotation No:</span>
          <span className="font-bold">{quotation.quotationNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDateTime(quotation.createdAt)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Valid Till:</span>
          <span>{formatDate(quotation.validUntil)}</span>
        </div>
        {(quotation.customer?.name || quotation.customerName) && (
          <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
            <span>Customer:</span>
            <span>{quotation.customer?.name ?? quotation.customerName}</span>
          </div>
        )}
      </div>

      {/* Items */}
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
          {quotation.items.map((item) => (
            <tr key={item.id}>
              <td className="py-1 max-w-[120px] truncate">{item.productNameSnapshot}</td>
              <td className="py-1 text-right">{formatQty(item.quantity.toString())}</td>
              <td className="py-1 text-right">{toNum(item.soldPrice).toFixed(0)}</td>
              <td className="py-1 text-right font-bold">{toNum(item.lineTotal).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals — no paid/due rows on a quotation */}
      <div className="border-t border-black pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>
            {sym} {toNum(quotation.subtotal).toFixed(2)}
          </span>
        </div>
        {toNum(quotation.discountAmount) > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>
              -{sym} {toNum(quotation.discountAmount).toFixed(2)}
            </span>
          </div>
        )}
        {toNum(quotation.taxAmount) > 0 && (
          <div className="flex justify-between">
            <span>Tax ({quotation.taxRate.toString()}%):</span>
            <span>
              {sym} {toNum(quotation.taxAmount).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1">
          <span>Estimated Total:</span>
          <span>
            {sym} {toNum(quotation.grandTotal).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-4 mt-4 border-t border-dashed border-black space-y-1 text-[10px]">
        <p className="font-bold">{settings.quotationFooter}</p>
        <p className="text-[9px] text-gray-500">Powered by BillKaro</p>
      </div>
    </div>
  );
}
