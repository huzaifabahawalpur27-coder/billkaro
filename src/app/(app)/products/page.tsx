import { listProducts, listBrandOptions, listCategoryOptions, listUnitOptions } from "@/server/services/catalogue";
import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { ProductsView, type ProductRow } from "./products-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  brand?: string;
  category?: string;
  status?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await requireBusiness();

  const [{ products, total, page, pageSize }, brands, categories, units] = await Promise.all([
    listProducts({
      search: params.q,
      brandId: params.brand,
      categoryId: params.category,
      status: params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined,
      page: params.page ? parseInt(params.page, 10) || 1 : 1,
    }),
    listBrandOptions(),
    listCategoryOptions(),
    listUnitOptions(),
  ]);

  const rows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    brandId: p.brandId,
    brandName: p.brand?.name ?? null,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    unitId: p.unitId,
    unitName: p.unit?.name ?? null,
    purchasePrice: p.purchasePrice?.toString() ?? null,
    salePrice: p.salePrice.toString(),
    wholesalePrice: p.wholesalePrice?.toString() ?? null,
    status: p.status,
  }));

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Apni billing rate list manage karein"
      />
      <ProductsView
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        brands={brands}
        categories={categories}
        units={units}
        can={{
          add: hasPermission(ctx, "ADD_PRODUCTS"),
          edit: hasPermission(ctx, "EDIT_PRODUCTS"),
          del: hasPermission(ctx, "DELETE_PRODUCTS"),
          changePrice: hasPermission(ctx, "CHANGE_PRICES"),
        }}
      />
    </>
  );
}
