import { listTenants } from "@/server/services/platform/tenants";
import { listPlans } from "@/server/services/platform/plans";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TenantsView } from "./tenants-view";
import { CreateTenantDialog } from "./create-tenant-dialog";

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
  const [{ tenants, total, page, pageSize }, plans] = await Promise.all([
    listTenants({
      search: params.q,
      status:
        params.status === "ACTIVE" || params.status === "SUSPENDED" ? params.status : undefined,
      page: params.page ? parseInt(params.page, 10) || 1 : 1,
    }),
    listPlans(),
  ]);

  return (
    <>
      <PageHeader
        title="Tenants"
        subtitle="Tamam registered businesses"
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/api/admin/export/tenants">
                <Download className="h-4 w-4 mr-1" /> Export XLSX
              </a>
            </Button>
            <CreateTenantDialog plans={plans.filter((p) => p.isActive)} />
          </>
        }
      />
      <TenantsView tenants={tenants} total={total} page={page} pageSize={pageSize} />
    </>
  );
}
