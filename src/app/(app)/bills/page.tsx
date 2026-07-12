import { listBills } from "@/server/services/bills";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { BillsView, type BillRow } from "./bills-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  customer?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await requireBusiness();

  const validStatus = ["PAID", "PARTIAL", "UDHAAR"] as const;
  type ValidStatus = typeof validStatus[number];
  const paymentStatus = validStatus.includes(params.status as ValidStatus)
    ? (params.status as ValidStatus)
    : undefined;

  const { bills, total, page, pageSize } = await listBills({
    search: params.q,
    customerId: params.customer,
    paymentStatus,
    from: params.from,
    to: params.to,
    page: params.page ? parseInt(params.page, 10) || 1 : 1,
  });

  const rows: BillRow[] = bills.map((b) => ({
    id: b.id,
    invoiceNumber: b.invoiceNumber,
    customerName: b.customer?.name ?? null,
    customerId: b.customerId,
    cashierName: b.cashier.name,
    status: b.status,
    paymentStatus: b.paymentStatus,
    grandTotal: b.grandTotal.toString(),
    amountPaid: b.amountPaid.toString(),
    amountDue: b.amountDue.toString(),
    itemCount: b._count.items,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Bills"
        subtitle="Tamam bills ki history"
      />
      <BillsView
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        currencySymbol={ctx.settings.currencySymbol}
        can={{ cancel: hasPermission(ctx, "CANCEL_BILLS") }}
      />
    </>
  );
}
