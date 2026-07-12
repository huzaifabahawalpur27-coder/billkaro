import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { BillView } from "./bill-view";
import { listProducts, listCategoryOptions } from "@/server/services/catalogue";

export const dynamic = "force-dynamic";

export default async function BillPage() {
  const ctx = await requireBusiness();

  // Fetch up to 100 active products and all categories
  const [{ products }, categories] = await Promise.all([
    listProducts({ status: "ACTIVE", pageSize: 100 }),
    listCategoryOptions(),
  ]);

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    salePrice: p.salePrice.toString(),
    unitName: p.unit?.name ?? null,
    categoryId: p.categoryId ?? null,
  }));

  return (
    <>
      <PageHeader title="New Bill" subtitle="Naya bill banayein — cash, partial ya udhaar" />
      <BillView
        initialProducts={mappedProducts}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        taxRate={ctx.settings.defaultTaxRate.toString()}
        currencySymbol={ctx.settings.currencySymbol}
        can={{
          createBill: hasPermission(ctx, "CREATE_BILLS"),
          discount: hasPermission(ctx, "APPLY_DISCOUNTS"),
          changePrice: hasPermission(ctx, "CHANGE_SALE_PRICE"),
          addCustomer: hasPermission(ctx, "MANAGE_CUSTOMERS"),
        }}
      />
    </>
  );
}
