import { listTenants } from "@/server/services/platform/tenants";
import { PageHeader } from "@/components/app/page-header";
import { TenantsView } from "./tenants-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { tenants, total, page, pageSize } = await listTenants({
    search: params.q,
    status: params.status === "ACTIVE" || params.status === "SUSPENDED" ? params.status : undefined,
    page: params.page ? parseInt(params.page, 10) || 1 : 1,
  });

  return (
    <>
      <PageHeader title="Tenants" subtitle="Tamam registered businesses" />
      <TenantsView tenants={tenants} total={total} page={page} pageSize={pageSize} />
    </>
  );
}
