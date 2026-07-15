import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ReceiptText } from "lucide-react";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { getQuotation } from "@/server/services/quotations";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge, type StatusKind } from "@/components/app/status-badge";
import { MoneyDisplay } from "@/components/app/money-display";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatQty } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CancelQuotationButton } from "./cancel-quotation-button";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, StatusKind> = {
  ACTIVE: "active",
  EXPIRED: "warning",
  CONVERTED: "neutral",
  CANCELLED: "cancelled",
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusiness();
  if (!ctx.settings.quotationsEnabled) notFound();

  const { id } = await params;
  const result = await getQuotation(id);
  if (!result) notFound();
  const { quotation, displayStatus } = result;
  const sym = ctx.settings.currencySymbol;
  const canCreate = hasPermission(ctx, "CREATE_BILLS");

  const toNum = (v: { toString(): string }) => parseFloat(v.toString());

  return (
    <>
      <PageHeader
        title={quotation.quotationNumber}
        subtitle="Quotation detail"
        backHref="/quotations"
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/quotations/${quotation.id}/print`} target="_blank">
                <Printer className="h-4 w-4 mr-1" /> Print
              </a>
            </Button>
            {displayStatus === "ACTIVE" && canCreate && (
              <>
                <Button asChild>
                  <Link href={`/bill?quotation=${quotation.id}`}>
                    <ReceiptText className="h-4 w-4 mr-1" /> Convert to Bill
                  </Link>
                </Button>
                <CancelQuotationButton
                  quotationId={quotation.id}
                  quotationNumber={quotation.quotationNumber}
                />
              </>
            )}
            {displayStatus === "EXPIRED" && canCreate && (
              <Button asChild variant="outline">
                <Link href={`/bill?quotation=${quotation.id}`}>
                  <ReceiptText className="h-4 w-4 mr-1" /> Convert anyway
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="max-w-2xl space-y-4">
        <div className="rounded-lg border bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <StatusBadge kind={STATUS_BADGE[displayStatus] ?? "neutral"}>
              {displayStatus}
            </StatusBadge>
            <span className="text-muted-foreground">
              Valid till <span className="font-medium">{formatDate(quotation.validUntil)}</span>
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{quotation.customer?.name ?? quotation.customerName ?? "Walk-in"}</dd>
            <dt className="text-muted-foreground">Banai gayi</dt>
            <dd>
              {formatDateTime(quotation.createdAt)} · {quotation.createdBy.name}
            </dd>
            {quotation.convertedSaleId && (
              <>
                <dt className="text-muted-foreground">Bill</dt>
                <dd>
                  <Link
                    href={`/bills/${quotation.convertedSaleId}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Converted bill dekhein →
                  </Link>
                </dd>
              </>
            )}
            {quotation.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd>{quotation.notes}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="rounded-lg border bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotation.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.productNameSnapshot}</div>
                    {item.skuSnapshot && (
                      <div className="text-xs text-muted-foreground">{item.skuSnapshot}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatQty(item.quantity.toString())}</TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay value={toNum(item.soldPrice).toFixed(2)} symbol={sym} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <MoneyDisplay value={toNum(item.lineTotal).toFixed(2)} symbol={sym} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <MoneyDisplay value={toNum(quotation.subtotal).toFixed(2)} symbol={sym} />
            </div>
            {toNum(quotation.discountAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <MoneyDisplay value={`-${toNum(quotation.discountAmount).toFixed(2)}`} symbol={sym} />
              </div>
            )}
            {toNum(quotation.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({quotation.taxRate.toString()}%)</span>
                <MoneyDisplay value={toNum(quotation.taxAmount).toFixed(2)} symbol={sym} />
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-semibold">
              <span>Total</span>
              <MoneyDisplay value={toNum(quotation.grandTotal).toFixed(2)} symbol={sym} />
            </div>
          </div>
        </div>

        <p className="rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 text-sm">
          Yeh quotation hai — bill nahi. Ledger ya khata par iska koi asar nahi hota.
        </p>
      </div>
    </>
  );
}
