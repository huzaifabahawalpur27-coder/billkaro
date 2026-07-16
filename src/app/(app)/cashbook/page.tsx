import { getCashBookEntries } from "@/server/services/cashbook";
import { requireBusiness } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { CashBookView } from "./cashbook-view";

export const dynamic = "force-dynamic";

export default async function CashBookPage() {
  const ctx = await requireBusiness();
  const data = await getCashBookEntries();

  const isUrdu = ctx.settings.language === "ur";

  return (
    <>
      <PageHeader
        title={isUrdu ? "کیش بک (Cash Book)" : "Cash Book"}
        subtitle={
          isUrdu
            ? "دکان کے روزمرہ اخراجات اور کیش آمد کا ریکارڈ رکھیں"
            : "Track shop expenses, tea, utility bills, and miscellaneous cash flows"
        }
      />
      <CashBookView
        initialData={data}
        currencySymbol={ctx.settings.currencySymbol}
        language={ctx.settings.language}
      />
    </>
  );
}
