import { ActivityBookingsBoard } from "@/components/admin/ActivityBookingsBoard";
import { PrivateLessonsBoard } from "@/components/admin/PrivateLessonsBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "שיעורים פרטיים ופעילויות" };

export default async function AdminPrivateLessonsPage() {
  const supabase = await createAdminDataClient();
  const today = todayInIsrael();

  const [
    { data: awaitingRows },
    { data: upcomingRows },
    { data: awaitingActivities },
    { data: upcomingActivities },
  ] = await Promise.all([
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
      .from("activity_bookings")
      .select(
        "id, status, session_date, start_time, end_time, created_at, enrollment_id, child_id, people_count, profiles(full_name, phone), children(full_name), programs(title)"
      )
      .eq("status", "awaiting_schedule")
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_bookings")
      .select(
        "id, status, session_date, start_time, end_time, created_at, enrollment_id, child_id, people_count, profiles(full_name, phone), children(full_name), programs(title)"
      )
      .eq("status", "scheduled")
      .gte("session_date", today)
      .order("session_date")
      .order("start_time")
      .limit(50),
  ]);

  const enrollmentIds = [
    ...new Set(
      [
        ...(awaitingRows ?? []),
        ...(upcomingRows ?? []),
        ...(awaitingActivities ?? []),
        ...(upcomingActivities ?? []),
      ]
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

  function mapRow(row: NonNullable<typeof awaitingRows>[number]) {
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

  function mapActivity(row: NonNullable<typeof awaitingActivities>[number]) {
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
      title: row.programs?.title ?? "פעילות",
      peopleCount: row.people_count,
      enrollmentId: row.enrollment_id,
      amount: amountByEnrollment.get(row.enrollment_id) ?? null,
    };
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="שיעורים פרטיים ופעילויות"
        description="תיאום מועדים ללקוחות שרכשו שיעור פרטי או פעילות."
      />
      <ActivityBookingsBoard
        awaiting={(awaitingActivities ?? []).map(mapActivity)}
        upcoming={(upcomingActivities ?? []).map(mapActivity)}
      />
      <PrivateLessonsBoard
        awaiting={(awaitingRows ?? []).map(mapRow)}
        upcoming={(upcomingRows ?? []).map(mapRow)}
      />
    </div>
  );
}
