import { listCategoriesWithStats } from "@/server/services/catalogue";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { CategoriesView } from "./categories-view";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = await requireBusiness();
  const categories = await listCategoriesWithStats();

  return (
    <>
      <PageHeader title="Categories" subtitle="Product categories manage karein" />
      <CategoriesView
        rows={categories.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount,
        }))}
        canManage={hasPermission(ctx, "EDIT_PRODUCTS")}
      />
    </>
  );
}
