import { requireBusiness, hasPermission } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { BillView } from "./bill-view";
import { listProducts, listCategoryOptions } from "@/server/services/catalogue";
import { getQuotationForPos } from "@/server/services/quotations";

export const dynamic = "force-dynamic";

export default async function BillPage({
  searchParams,
}: {
  searchParams: Promise<{ quotation?: string }>;
}) {
  const ctx = await requireBusiness();
  const params = await searchParams;

  // Fetch up to 100 active products and all categories
  const [{ products }, categories] = await Promise.all([
    listProducts({ status: "ACTIVE", pageSize: 100 }),
    listCategoryOptions(),
  ]);

  // Convert-to-bill: prefill the cart from a quotation (current rates).
  const sourceQuotation =
    params.quotation && ctx.settings.quotationsEnabled
      ? await getQuotationForPos(params.quotation)
      : null;

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    salePrice: p.salePrice.toString(),
    unitName: p.unit?.name ?? null,
    isFractional: p.unit?.isFractional ?? false,
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
        quotationsEnabled={ctx.settings.quotationsEnabled}
        defaultValidityDays={ctx.settings.quotationValidityDays}
        sourceQuotation={sourceQuotation}
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
