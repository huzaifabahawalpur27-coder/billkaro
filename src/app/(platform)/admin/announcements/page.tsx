import { listAnnouncements } from "@/server/services/platform/announcements";
import { listTenants } from "@/server/services/platform/tenants";
import { PageHeader } from "@/components/app/page-header";
import { AnnouncementsView } from "./announcements-view";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const [announcements, { tenants }] = await Promise.all([
    listAnnouncements(),
    listTenants({ page: 1 }),
  ]);

  return (
    <>
      <PageHeader
        title="Announcements"
        subtitle="Shopkeepers ko messages bhejein — sab ko ya kisi aik tenant ko"
      />
      <AnnouncementsView
        announcements={announcements}
        tenants={tenants.map((t) => ({ id: t.id, name: t.name }))}
      />
    </>
  );
}
