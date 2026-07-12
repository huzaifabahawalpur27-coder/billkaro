import { listLedgerEntries } from "@/server/services/ledger";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { LedgerView, type LedgerRow } from "./ledger-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  customer?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: string;
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireBusiness();

  const { entries, total, page, pageSize } = await listLedgerEntries({
    customerId: params.customer,
    from: params.from,
    to: params.to,
    page: params.page ? parseInt(params.page, 10) || 1 : 1,
  });

  const rows: LedgerRow[] = entries.map((e) => ({
    id: e.id,
    type: e.type,
    customerName: e.customer.name,
    customerId: e.customer.id,
    amount: e.amount.toString(),
    balanceAfter: e.balanceAfter.toString(),
    description: e.description,
    invoiceNumber: e.sale?.invoiceNumber ?? null,
    saleId: e.saleId ?? null,
    createdByName: e.createdBy.name,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Ledger"
        subtitle="Tamam customers ki khata — har entry"
      />
      <LedgerView rows={rows} total={total} page={page} pageSize={pageSize} />
    </>
  );
}
