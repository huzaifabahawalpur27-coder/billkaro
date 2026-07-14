import { listPlans } from "@/server/services/platform/plans";
import { PageHeader } from "@/components/app/page-header";
import { PlansView } from "./plans-view";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await listPlans();

  return (
    <>
      <PageHeader title="Plans" subtitle="Subscription tiers aur pricing" />
      <PlansView plans={plans} />
    </>
  );
}
