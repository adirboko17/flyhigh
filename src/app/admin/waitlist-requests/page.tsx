import { WaitlistRequestList } from "@/components/admin/WaitlistRequestList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "רשימת המתנה" };

export default async function AdminWaitlistRequestsPage() {
  const supabase = await createAdminDataClient();
  const { data: requests } = await supabase
    .from("class_waitlist_requests")
    .select(
      "id, created_at, full_name, phone, child_name, child_age, child_gender, skill_level, desired_class_name, preferred_times, status"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="רשימת המתנה"
        description="פניות מלקוחות שלא מצאו חוג מתאים ומחכים שנפתח אחד."
      />
      <WaitlistRequestList requests={requests ?? []} />
    </div>
  );
}
