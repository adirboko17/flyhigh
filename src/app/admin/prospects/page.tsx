import { ProspectList, type ProspectClassOption, type ProspectRow } from "@/components/admin/ProspectList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";

export const metadata = { title: "מתעניינים" };

export default async function AdminProspectsPage() {
  const supabase = await createAdminDataClient();

  const [{ data: rows }, { data: classes }] = await Promise.all([
    supabase
      .from("class_prospects")
      .select(
        "id, created_at, full_name, phone, child_name, class_id, trial_date, status, notes, classes(title)"
      )
      .order("trial_date", { ascending: false }),
    supabase
      .from("classes")
      .select("id, title, status")
      .order("title"),
  ]);

  const prospects: ProspectRow[] = ((rows ?? []) as Array<{
    id: string;
    created_at: string;
    full_name: string;
    phone: string | null;
    child_name: string | null;
    class_id: string;
    trial_date: string;
    status: ProspectRow["status"];
    notes: string | null;
    classes: { title: string } | null;
  }>).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    full_name: row.full_name,
    phone: row.phone,
    child_name: row.child_name,
    class_id: row.class_id,
    trial_date: row.trial_date,
    status: row.status,
    notes: row.notes,
    classTitle: row.classes?.title?.trim() || "חוג שנמחק",
  }));

  const classOptions: ProspectClassOption[] = (classes ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    inactive: item.status !== "active",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="מתעניינים"
        description="מעקב אחרי מי שמגיעה לשיעור ניסיון — שם, חוג, מועד, והאם הגיעה. במקום הנייר."
      />
      <ProspectList
        prospects={prospects}
        classes={classOptions}
        today={todayInIsrael()}
      />
    </div>
  );
}
