import { getStaffList } from "@/server/services/staff";
import { requireBusiness } from "@/server/auth/guards";
import { PageHeader } from "@/components/app/page-header";
import { StaffView } from "./staff-view";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const ctx = await requireBusiness();
  const workers = await getStaffList();

  const isUrdu = ctx.settings.language === "ur";

  return (
    <>
      <PageHeader
        title={isUrdu ? "اسٹاف بک (Staff Book)" : "Staff Book"}
        subtitle={
          isUrdu
            ? "دکان کے ملازمین کی حاضری، پیشگی (ایڈوانس) اور تنخواہ کا حساب رکھیں"
            : "Manage worker attendance, advances (peishgi), and salary/daily wages"
        }
      />
      <StaffView
        workers={workers}
        currencySymbol={ctx.settings.currencySymbol}
        language={ctx.settings.language}
      />
    </>
  );
}
