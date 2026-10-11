import {
  ProspectList,
  type ProspectOffering,
  type ProspectOfferingKind,
  type ProspectRow,
} from "@/components/admin/ProspectList";
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

const INTEREST_KIND_LABEL: Record<ProspectOfferingKind, string> = {
  class: "חוג",
  membership: "מנוי",
  activity: "פעילות",
  pool_pass: "כניסה לבריכה",
  private_lesson: "שיעור פרטי",
};

function prospectInterest(row: {
  class_id: string | null;
  program_id: string | null;
  pool_pass_id: string | null;
  private_lesson_id: string | null;
  classes: { title: string } | null;
  programs: { title: string; kind: "membership" | "activity" } | null;
  pool_passes: { title: string } | null;
  private_lessons: { title: string } | null;
}): { key: string; title: string; kind: ProspectOfferingKind; label: string } {
  if (row.class_id) {
    return {
      key: `class:${row.class_id}`,
      title: row.classes?.title?.trim() || "חוג שנמחק",
      kind: "class",
      label: INTEREST_KIND_LABEL.class,
    };
  }
  if (row.program_id) {
    const kind = row.programs?.kind === "activity" ? "activity" : "membership";
    return {
      key: `program:${row.program_id}`,
      title:
        row.programs?.title?.trim() ||
        (kind === "activity" ? "פעילות שנמחקה" : "מנוי שנמחק"),
      kind,
      label: INTEREST_KIND_LABEL[kind],
    };
  }
  if (row.pool_pass_id) {
    return {
      key: `pool_pass:${row.pool_pass_id}`,
      title: row.pool_passes?.title?.trim() || "כניסה שנמחקה",
      kind: "pool_pass",
      label: INTEREST_KIND_LABEL.pool_pass,
    };
  }
  if (row.private_lesson_id) {
    return {
      key: `private_lesson:${row.private_lesson_id}`,
      title: row.private_lessons?.title?.trim() || "שיעור פרטי שנמחק",
      kind: "private_lesson",
      label: INTEREST_KIND_LABEL.private_lesson,
    };
  }
  return {
    key: "",
    title: "פריט שנמחק",
    kind: "class",
    label: INTEREST_KIND_LABEL.class,
  };
}

export const metadata = { title: "מתעניינים" };

export default async function AdminProspectsPage() {
  const supabase = await createAdminDataClient();

  const [
    { data: rows },
    { data: classes },
    { data: programs },
    { data: poolPasses },
    { data: privateLessons },
  ] = await Promise.all([
    supabase
      .from("class_prospects")
      .select(
        "id, created_at, full_name, phone, child_name, class_id, program_id, pool_pass_id, private_lesson_id, session_id, trial_date, status, notes, classes(title), programs(title, kind), pool_passes(title), private_lessons(title), class_sessions(start_time, end_time, weekly_slot_id)"
      )
      .order("trial_date", { ascending: false }),
    supabase.from("classes").select("id, title, status").order("title"),
    supabase.from("programs").select("id, title, status, kind").order("title"),
    supabase.from("pool_passes").select("id, title, status").order("title"),
    supabase
      .from("private_lessons")
      .select("id, title, status")
      .order("title"),
  ]);

  const loaded = (rows ?? []) as Array<{
    id: string;
    created_at: string;
    full_name: string;
    phone: string | null;
    child_name: string | null;
    class_id: string | null;
    program_id: string | null;
    pool_pass_id: string | null;
    private_lesson_id: string | null;
    session_id: string | null;
    trial_date: string | null;
    status: ProspectRow["status"];
    notes: string | null;
    classes: { title: string } | null;
    programs: { title: string; kind: "membership" | "activity" } | null;
    pool_passes: { title: string } | null;
    private_lessons: { title: string } | null;
    class_sessions: {
      start_time: string;
      end_time: string;
      weekly_slot_id: string | null;
    } | null;
  }>;

  const classIds = [
    ...new Set(
      loaded
        .map((row) => row.class_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
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
    const next =
      row.class_id && row.trial_date
        ? currentProspectSession(
            {
              session_id: row.session_id,
              trial_date: row.trial_date,
              weekly_slot_id: row.class_sessions?.weekly_slot_id ?? null,
              status: row.status,
            },
            sessionsByClass.get(row.class_id) ?? [],
            visits,
            today
          )
        : null;
    const interest = prospectInterest(row);
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
      interestKey: interest.key,
      interestTitle: interest.title,
      interestKind: interest.kind,
      interestKindLabel: interest.label,
    };
  });

  const offerings: ProspectOffering[] = [
    ...(classes ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      inactive: item.status !== "active",
      kind: "class" as const,
    })),
    ...(programs ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      inactive: item.status !== "active",
      kind: (item.kind === "activity" ? "activity" : "membership") as ProspectOfferingKind,
    })),
    ...(poolPasses ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      inactive: item.status !== "active",
      kind: "pool_pass" as const,
    })),
    ...(privateLessons ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      inactive: item.status !== "active",
      kind: "private_lesson" as const,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="מתעניינים"
        description="מתעניינת יכולה להיות מקושרת לחוג, לשיעור פרטי, למנוי, לפעילות או לכניסה לבריכה. בחוג היא עוברת למפגש הבא אחרי כל הגעה או היעדרות. הרשמה לחוג מורידה אותה אוטומטית."
      />
      <ProspectList
        prospects={prospects}
        offerings={offerings}
        today={today}
      />
    </div>
  );
}
