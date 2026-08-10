import { PrivateLessonsBoard } from "@/components/admin/PrivateLessonsBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "שיעורים פרטיים" };

export default async function AdminPrivateLessonsPage() {
  const supabase = await createClient();
  const today = todayInIsrael();

  const [{ data: awaitingRows }, { data: upcomingRows }, { data: payments }] =
    await Promise.all([
      supabase
        .from("private_lesson_slots")
        .select(
          "id, status, session_date, start_time, end_time, created_at, enrollment_id, child_id, profiles(full_name, phone), children(full_name), private_lessons(title, duration_minutes)"
        )
        .eq("status", "awaiting_schedule")
        .order("created_at", { ascending: false }),
      supabase
        .from("private_lesson_slots")
        .select(
          "id, status, session_date, start_time, end_time, created_at, enrollment_id, child_id, profiles(full_name, phone), children(full_name), private_lessons(title, duration_minutes)"
        )
        .eq("status", "scheduled")
        .gte("session_date", today)
        .order("session_date")
        .order("start_time")
        .limit(50),
      supabase
        .from("payments")
        .select("enrollment_id, amount")
        .not("enrollment_id", "is", null),
    ]);

  const amountByEnrollment = new Map<string, number>();
  for (const payment of payments ?? []) {
    if (!payment.enrollment_id) continue;
    amountByEnrollment.set(
      payment.enrollment_id,
      (amountByEnrollment.get(payment.enrollment_id) ?? 0) +
        Number(payment.amount)
    );
  }

  function mapRow(
    row: NonNullable<typeof awaitingRows>[number]
  ) {
    return {
      id: row.id,
      status: row.status,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: row.created_at,
      parentName: row.profiles?.full_name ?? "לקוח",
      parentPhone: row.profiles?.phone ?? null,
      childName: row.children?.full_name ?? null,
      lessonTitle: row.private_lessons?.title ?? "שיעור פרטי",
      durationMinutes: row.private_lessons?.duration_minutes ?? 45,
      enrollmentId: row.enrollment_id,
      amount: amountByEnrollment.get(row.enrollment_id) ?? null,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="שיעורים פרטיים"
        description="תיאום מועדים ללקוחות שרכשו שיעור פרטי, ותצוגה מרוכזת של מה שמתוזמן."
      />
      <PrivateLessonsBoard
        awaiting={(awaitingRows ?? []).map(mapRow)}
        upcoming={(upcomingRows ?? []).map(mapRow)}
      />
    </div>
  );
}
