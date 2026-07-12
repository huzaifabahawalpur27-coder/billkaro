import { getBill } from "@/server/services/bills";
import { requireBusiness } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { BillDetailView } from "./bill-detail-view";

export const dynamic = "force-dynamic";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireBusiness();
  const { sale, canCancel, settings, business } = await getBill(id);

  return (
    <>
      <PageHeader
        title={sale.invoiceNumber}
        subtitle={`Bill detail`}
        backHref="/bills"
      />
      <BillDetailView
        sale={{
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          status: sale.status,
          paymentStatus: sale.paymentStatus,
          paymentMethod: sale.paymentMethod,
          grandTotal: sale.grandTotal.toString(),
          amountPaid: sale.amountPaid.toString(),
          amountDue: sale.amountDue.toString(),
          cashReceived: sale.cashReceived?.toString() ?? null,
          changeDue: sale.changeDue?.toString() ?? null,
          subtotal: sale.subtotal.toString(),
          discountAmount: sale.discountAmount.toString(),
          taxAmount: sale.taxAmount.toString(),
          taxRate: sale.taxRate.toString(),
          notes: sale.notes,
          cashierName: sale.cashier.name,
          cancelledAt: sale.cancelledAt?.toISOString() ?? null,
          cancelledByName: sale.cancelledBy?.name ?? null,
          cancelReason: sale.cancelReason,
          createdAt: sale.createdAt.toISOString(),
          customer: sale.customer
            ? { id: sale.customer.id, name: sale.customer.name, phone: sale.customer.phone }
            : null,
          items: sale.items.map((i) => ({
            id: i.id,
            name: i.productNameSnapshot,
            sku: i.skuSnapshot,
            cataloguePrice: i.cataloguePrice?.toString() ?? null,
            soldPrice: i.soldPrice.toString(),
            quantity: i.quantity.toString(),
            lineTotal: i.lineTotal.toString(),
            isOpenItem: i.isOpenItem,
          })),
          payments: sale.payments.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            method: p.method,
            receiptNumber: p.receiptNumber,
            receivedByName: p.receivedBy.name,
            paymentDate: p.paymentDate.toISOString(),
          })),
        }}
        canCancel={canCancel}
        currencySymbol={settings.currencySymbol}
        business={{ name: business.name, address: business.address, phone: business.phone }}
        footer={settings.invoiceFooter}
      />
    </>
  );
}
