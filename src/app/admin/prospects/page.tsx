import { ProspectList, type ProspectClassOption, type ProspectRow } from "@/components/admin/ProspectList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  currentProspectSession,
  parseVisitStatus,
  summarizeProspectVisits,
  type ProspectScheduleSession,
  type ProspectVisitMark,
} from "@/lib/attendance/prospectSchedule";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";

export const metadata = { title: "מתעניינים" };

export default async function AdminProspectsPage() {
  const supabase = await createAdminDataClient();

  const [{ data: rows }, { data: classes }] = await Promise.all([
    supabase
      .from("class_prospects")
      .select(
        "id, created_at, full_name, phone, child_name, class_id, session_id, trial_date, status, notes, classes(title), class_sessions(start_time, end_time, weekly_slot_id)"
      )
      .order("trial_date", { ascending: false }),
    supabase
      .from("classes")
      .select("id, title, status")
      .order("title"),
  ]);

  const loaded = (rows ?? []) as Array<{
    id: string;
    created_at: string;
    full_name: string;
    phone: string | null;
    child_name: string | null;
    class_id: string;
    session_id: string | null;
    trial_date: string;
    status: ProspectRow["status"];
    notes: string | null;
    classes: { title: string } | null;
    class_sessions: {
      start_time: string;
      end_time: string;
      weekly_slot_id: string | null;
    } | null;
  }>;

  const classIds = [...new Set(loaded.map((row) => row.class_id))];
  const prospectIds = loaded.map((row) => row.id);
  const [{ data: sessionRows }, { data: visitRows }] = await Promise.all([
    classIds.length > 0
      ? supabase
          .from("class_sessions")
          .select(
            "id, class_id, session_date, start_time, end_time, weekly_slot_id, status"
          )
          .in("class_id", classIds)
          .neq("status", "cancelled")
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            class_id: string;
            session_date: string;
            start_time: string;
            end_time: string;
            weekly_slot_id: string | null;
            status: string;
          }>,
        }),
    prospectIds.length > 0
      ? supabase
          .from("prospect_visits")
          .select("prospect_id, session_id, status")
          .in("prospect_id", prospectIds)
      : Promise.resolve({
          data: [] as Array<{
            prospect_id: string;
            session_id: string;
            status: string;
          }>,
        }),
  ]);

  const sessionsByClass = new Map<string, ProspectScheduleSession[]>();
  for (const session of sessionRows ?? []) {
    const list = sessionsByClass.get(session.class_id) ?? [];
    list.push(session);
    sessionsByClass.set(session.class_id, list);
  }

  const visitsByProspect = new Map<string, ProspectVisitMark[]>();
  for (const visit of visitRows ?? []) {
    const status = parseVisitStatus(visit.status);
    if (!status) continue;
    const list = visitsByProspect.get(visit.prospect_id) ?? [];
    list.push({ session_id: visit.session_id, status });
    visitsByProspect.set(visit.prospect_id, list);
  }

  const today = todayInIsrael();
  const prospects: ProspectRow[] = loaded.map((row) => {
    const visits = visitsByProspect.get(row.id) ?? [];
    const counts = summarizeProspectVisits(visits);
    const next = currentProspectSession(
      {
        session_id: row.session_id,
        trial_date: row.trial_date,
        weekly_slot_id: row.class_sessions?.weekly_slot_id ?? null,
        status: row.status,
      },
      sessionsByClass.get(row.class_id) ?? [],
      visits,
      today
    );
    return {
      id: row.id,
      created_at: row.created_at,
      full_name: row.full_name,
      phone: row.phone,
      child_name: row.child_name,
      class_id: row.class_id,
      session_id: row.session_id,
      trial_date: row.trial_date,
      next_session_id: next?.id ?? null,
      next_date: next?.session_date ?? null,
      next_start: next?.start_time ?? null,
      next_end: next?.end_time ?? null,
      arrived_count: counts.arrived,
      no_show_count: counts.noShow,
      session_start: row.class_sessions?.start_time ?? null,
      session_end: row.class_sessions?.end_time ?? null,
      status: row.status,
      notes: row.notes,
      classTitle: row.classes?.title?.trim() || "חוג שנמחק",
    };
  });

  const classOptions: ProspectClassOption[] = (classes ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    inactive: item.status !== "active",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="מתעניינים"
        description="מתעניינת נשארת ברשימה ועוברת למפגש הבא אחרי כל הגעה או היעדרות, וגם אם המועד עבר בלי שהגיעה. הרשמה לחוג מורידה אותה אוטומטית."
      />
      <ProspectList
        prospects={prospects}
        classes={classOptions}
        today={today}
      />
    </div>
  );
}
