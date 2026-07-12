import { listCustomers } from "@/server/services/customers";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { KhataView, type KhataRow } from "./khata-view";

export const dynamic = "force-dynamic";

export default async function KhataPage() {
  const ctx = await requireBusiness();

  const { customers } = await listCustomers({
    hasBalance: false,
    pageSize: 100,
  });

  const rows: KhataRow[] = customers
    .sort((a, b) => parseFloat(b.currentBalance) - parseFloat(a.currentBalance))
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      currentBalance: c.currentBalance,
      lastTransactionAt: c.lastTransactionAt?.toISOString() ?? null,
      lastPaymentAt: c.lastPaymentAt?.toISOString() ?? null,
    }));

  const totalUdhaar = rows
    .reduce((s, r) => s + parseFloat(r.currentBalance), 0)
    .toFixed(2);

  return (
    <>
      <PageHeader
        title="Udhaar Khata"
        subtitle="Tamam customers ka udhaar ek jagah"
      />
      <KhataView
        rows={rows}
        totalUdhaar={totalUdhaar}
        currencySymbol={ctx.settings.currencySymbol}
        can={{ receivePayment: hasPermission(ctx, "RECEIVE_PAYMENTS") }}
      />
    </>
  );
}
