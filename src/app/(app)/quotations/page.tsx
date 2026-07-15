import { notFound } from "next/navigation";
import { requireBusiness } from "@/server/auth/guards";
import { listQuotations } from "@/server/services/quotations";
import { PageHeader } from "@/components/app/page-header";
import { QuotationsView } from "./quotations-view";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
}

const STATUSES = ["ACTIVE", "EXPIRED", "CONVERTED", "CANCELLED"] as const;

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireBusiness();
  if (!ctx.settings.quotationsEnabled) notFound();

  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as (typeof STATUSES)[number])
    : undefined;

  const { quotations, total, page, pageSize } = await listQuotations({
    search: params.q,
    status,
    page: params.page ? parseInt(params.page, 10) || 1 : 1,
  });

  return (
    <>
      <PageHeader title="Quotations" subtitle="Rate estimates — bill nahi bante jab tak convert na karein" />
      <QuotationsView
        rows={quotations}
        total={total}
        page={page}
        pageSize={pageSize}
        currencySymbol={ctx.settings.currencySymbol}
      />
    </>
  );
}
