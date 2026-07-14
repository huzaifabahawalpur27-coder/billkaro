import { notFound } from "next/navigation";
import { getTenant } from "@/server/services/platform/tenants";
import { listPlans } from "@/server/services/platform/plans";
import { PageHeader } from "@/components/app/page-header";
import { TenantDetailView } from "./tenant-detail-view";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, plans] = await Promise.all([getTenant(id), listPlans()]);
  if (!detail) notFound();

  return (
    <>
      <PageHeader
        title={detail.tenant.name}
        subtitle={`Owner: ${detail.tenant.ownerName}`}
        backHref="/admin/tenants"
      />
      <TenantDetailView detail={detail} plans={plans.filter((p) => p.isActive)} />
    </>
  );
}
