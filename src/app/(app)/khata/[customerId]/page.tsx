import { getCustomerLedger } from "@/server/services/ledger";
import { getCustomerSummary } from "@/server/services/customers";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { KhataDetailView, type LedgerEntryRow } from "./khata-detail-view";

export const dynamic = "force-dynamic";

export default async function KhataDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const ctx = await requireBusiness();

  const [{ customer, entries }, summary] = await Promise.all([
    getCustomerLedger(customerId),
    getCustomerSummary(customerId),
  ]);

  const ledgerRows: LedgerEntryRow[] = entries.map((e) => ({
    id: e.id,
    type: e.type,
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
        title={customer.name}
        subtitle={customer.phone ?? "Khata detail"}
        backHref="/khata"
      />
      <KhataDetailView
        customer={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          currentBalance: customer.currentBalance.toString(),
        }}
        summary={summary}
        entries={ledgerRows}
        currencySymbol={ctx.settings.currencySymbol}
        can={{
          receivePayment: hasPermission(ctx, "RECEIVE_PAYMENTS"),
          adjustLedger: hasPermission(ctx, "ADJUST_LEDGER"),
          viewBills: hasPermission(ctx, "VIEW_BILLS"),
        }}
      />
    </>
  );
}
