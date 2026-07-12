import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/app/page-header";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, business } = await getSettings();

  return (
    <>
      <PageHeader title="Settings" subtitle="Business aur invoice settings" />
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
        }}
        businessName={business.name}
      />
    </>
  );
}
