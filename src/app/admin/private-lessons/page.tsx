import { ScheduleBoard, type AdminScheduleRow } from "@/components/admin/ScheduleBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { activityDurationLabel } from "@/lib/programs";

export const metadata = { title: "תיאום מועדים" };

export default async function AdminPrivateLessonsPage() {
  const supabase = await createAdminDataClient();

  const [{ data: lessonRows }, { data: activityRows }, { data: passRows }] =
    await Promise.all([
      supabase
        .from("private_lesson_slots")
        .select(
          "id, status, session_date, start_time, created_at, enrollment_id, profiles(full_name, phone), children(full_name), private_lessons(title, duration_minutes)"
        )
        .in("status", ["awaiting_schedule", "scheduled"])
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_bookings")
        .select(
          "id, status, session_date, start_time, created_at, enrollment_id, people_count, profiles(full_name, phone), children(full_name), programs(title, duration_minutes, kind)"
        )
        .in("status", ["awaiting_schedule", "scheduled"])
        .order("created_at", { ascending: false }),
      supabase
        .from("pool_pass_bookings")
        .select(
          "id, status, session_date, start_time, created_at, enrollment_id, profiles(full_name, phone), children(full_name), pool_passes(title)"
        )
        .in("status", ["awaiting_schedule", "scheduled"])
        .order("created_at", { ascending: false }),
    ]);

  const enrollmentIds = [
    ...new Set(
      [...(lessonRows ?? []), ...(activityRows ?? []), ...(passRows ?? [])]
        .map((row) => row.enrollment_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: payments } =
    enrollmentIds.length > 0
      ? await supabase
          .from("payments")
          .select("enrollment_id, amount")
          .in("enrollment_id", enrollmentIds)
      : { data: [] };

  const amountByEnrollment = new Map<string, number>();
  for (const payment of payments ?? []) {
    if (!payment.enrollment_id) continue;
    amountByEnrollment.set(
      payment.enrollment_id,
      (amountByEnrollment.get(payment.enrollment_id) ?? 0) +
        Number(payment.amount)
    );
  }

  const rows: AdminScheduleRow[] = [
    ...(lessonRows ?? []).flatMap((row) => {
      if (row.status !== "awaiting_schedule" && row.status !== "scheduled") {
        return [];
      }
      const duration = row.private_lessons?.duration_minutes;
      return [
        {
          id: row.id,
          kind: "private_lesson" as const,
          title: row.private_lessons?.title ?? "שיעור פרטי",
          status: row.status,
          sessionDate: row.session_date,
          startTime: row.start_time,
          createdAt: row.created_at,
          parentName: row.profiles?.full_name ?? "לקוח",
          parentPhone: row.profiles?.phone ?? null,
          childName: row.children?.full_name ?? null,
          detail: duration != null ? activityDurationLabel(duration) : null,
          amount: amountByEnrollment.get(row.enrollment_id) ?? null,
        },
      ];
    }),
    ...(activityRows ?? []).flatMap((row) => {
      if (row.status !== "awaiting_schedule" && row.status !== "scheduled") {
        return [];
      }
      const duration = row.programs?.duration_minutes;
      const isActivity = row.programs?.kind === "activity";
      const people =
        row.people_count === 1
          ? "משתתף אחד"
          : `${row.people_count} משתתפים`;
      return [
        {
          id: row.id,
          kind: "activity" as const,
          title: row.programs?.title ?? (isActivity ? "פעילות" : "מנוי"),
          status: row.status,
          sessionDate: row.session_date,
          startTime: row.start_time,
          createdAt: row.created_at,
          parentName: row.profiles?.full_name ?? "לקוח",
          parentPhone: row.profiles?.phone ?? null,
          childName: row.children?.full_name ?? null,
          detail: duration != null ? `${activityDurationLabel(duration)} · ${people}` : people,
          amount: amountByEnrollment.get(row.enrollment_id) ?? null,
          kindLabel: isActivity ? "פעילות" : "מנוי",
        },
      ];
    }),
    ...(passRows ?? []).flatMap((row) => {
      if (row.status !== "awaiting_schedule" && row.status !== "scheduled") {
        return [];
      }
      return [
        {
          id: row.id,
          kind: "pool_pass" as const,
          title: row.pool_passes?.title ?? "כרטיסייה",
          status: row.status,
          sessionDate: row.session_date,
          startTime: row.start_time,
          createdAt: row.created_at,
          parentName: row.profiles?.full_name ?? "לקוח",
          parentPhone: row.profiles?.phone ?? null,
          childName: row.children?.full_name ?? null,
          detail: null,
          amount: amountByEnrollment.get(row.enrollment_id) ?? null,
        },
      ];
    }),
  ].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "awaiting_schedule" ? -1 : 1;
    }
    if (a.status === "scheduled") {
      return (b.sessionDate ?? "").localeCompare(a.sessionDate ?? "");
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="תיאום מועדים"
        description="טבלה אחת לכל רכישה שסומנה לתיאום מועדים. משנים סטטוס, בוחרים תאריך — והמועד נכנס ללוח השנה."
      />
      <ScheduleBoard rows={rows} />
    </div>
  );
}
