import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/app/page-header";
import { Separator } from "@/components/ui/separator";
import { SettingsView } from "./settings-view";
import { ShopDetailsForm } from "./shop-details-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, business } = await getSettings();

  return (
    <>
      <PageHeader title="Settings" subtitle="Shop, business aur invoice settings" />
      <div className="max-w-2xl space-y-8">
        <ShopDetailsForm
          profile={{
            name: business.name,
            ownerName: business.ownerName,
            phone: business.phone ?? "",
            address: business.address ?? "",
            businessType: business.businessType ?? "",
            logoUrl: settings.logoUrl ?? "",
          }}
        />
        <Separator />
        <SettingsView
          settings={{
            currencyCode: settings.currencyCode,
            currencySymbol: settings.currencySymbol,
            invoicePrefix: settings.invoicePrefix,
            receiptPrefix: settings.receiptPrefix,
            defaultTaxRate: settings.defaultTaxRate.toString(),
            receiptSize: settings.receiptSize,
            priceRounding: settings.priceRounding,
            invoiceFooter: settings.invoiceFooter,
            language: settings.language,
            quotationsEnabled: settings.quotationsEnabled,
            quotationPrefix: settings.quotationPrefix,
            quotationValidityDays: String(settings.quotationValidityDays),
            quotationFooter: settings.quotationFooter,
          }}
        />
      </div>
    </>
  );
}
