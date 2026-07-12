import { listBrandsWithStats } from "@/server/services/catalogue";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { BrandsView } from "./brands-view";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const ctx = await requireBusiness();
  const brands = await listBrandsWithStats();

  return (
    <>
      <PageHeader title="Brands" subtitle="Brands manage karein aur brand-wise prices update karein" />
      <BrandsView
        rows={brands.map((b) => ({
          id: b.id,
          name: b.name,
          productCount: b.productCount,
          lastPriceUpdate: b.lastPriceUpdate?.toISOString() ?? null,
        }))}
        canManage={hasPermission(ctx, "EDIT_PRODUCTS")}
        canBulkUpdate={hasPermission(ctx, "BULK_PRICE_UPDATE")}
      />
    </>
  );
}
