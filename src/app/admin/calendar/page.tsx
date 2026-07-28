import {
  ClassCalendar,
  type CalendarSession,
} from "@/components/admin/ClassCalendar";
import {
  buildMonthGrid,
  monthLabel,
  monthOf,
  monthRange,
  parseMonthParam,
  shiftMonth,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "לוח שנה" };

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = todayInIsrael();
  const month = parseMonthParam(monthParam, monthOf(today));
  const { start, end } = monthRange(month);

  const supabase = await createClient();

  const [{ data: sessions }, { data: enrollments }, { data: instructors }] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select(
          "id, class_id, session_date, start_time, end_time, status, notes, substitute_instructor_id, substitute:instructors!class_sessions_substitute_instructor_id_fkey(full_name), classes(id, title, category, capacity, status, instructor_id, instructors(full_name))"
        )
        .gte("session_date", start)
        .lte("session_date", end)
        .order("session_date")
        .order("start_time"),
      supabase
        .from("enrollments")
        .select("class_id")
        .eq("type", "class")
        .eq("status", "active")
        .not("class_id", "is", null),
      supabase
        .from("instructors")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name"),
    ]);

  const registeredByClass = new Map<string, number>();
  for (const enrollment of enrollments ?? []) {
    if (!enrollment.class_id) continue;
    registeredByClass.set(
      enrollment.class_id,
      (registeredByClass.get(enrollment.class_id) ?? 0) + 1
    );
  }

  const calendarSessions: CalendarSession[] = (sessions ?? []).flatMap((session) => {
    const cls = session.classes;
    if (!cls) return [];

    return [
      {
        id: session.id,
        classId: session.class_id,
        title: cls.title,
        category: cls.category,
        instructorId: cls.instructor_id,
        instructor: cls.instructors?.full_name ?? null,
        substituteInstructorId: session.substitute_instructor_id,
        substituteInstructor: session.substitute?.full_name ?? null,
        date: session.session_date,
        startTime: session.start_time.slice(0, 5),
        endTime: session.end_time.slice(0, 5),
        status: session.status,
        notes: session.notes,
        capacity: cls.capacity,
        registered: registeredByClass.get(session.class_id) ?? 0,
      },
    ];
  });

  return (
    <ClassCalendar
      month={month}
      monthTitle={monthLabel(month)}
      previousMonth={shiftMonth(month, -1)}
      nextMonth={shiftMonth(month, 1)}
      currentMonth={monthOf(today)}
      today={today}
      days={buildMonthGrid(month, today)}
      sessions={calendarSessions}
      instructors={instructors ?? []}
    />
  );
}
