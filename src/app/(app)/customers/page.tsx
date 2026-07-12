import { listCustomers } from "@/server/services/customers";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { CustomersView, type CustomerRow } from "./customers-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await requireBusiness();

  const { customers, total, page, pageSize } = await listCustomers({
    search: params.q,
    status: params.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    page: params.page ? parseInt(params.page, 10) || 1 : 1,
  });

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    creditLimit: c.creditLimit?.toString() ?? null,
    currentBalance: c.currentBalance,
    status: c.status,
    lastTransactionAt: c.lastTransactionAt?.toISOString() ?? null,
    lastPaymentAt: c.lastPaymentAt?.toISOString() ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Apne customers aur unka udhaar manage karein"
      />
      <CustomersView
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        can={{
          manage: hasPermission(ctx, "MANAGE_CUSTOMERS"),
          viewLedger: hasPermission(ctx, "VIEW_LEDGER"),
        }}
      />
    </>
  );
}
