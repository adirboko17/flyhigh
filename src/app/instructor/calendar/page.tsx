import { ClassCalendar, type CalendarSession, type CalendarView } from "@/components/admin/ClassCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import { enrollmentMatchesCalendarSession } from "@/lib/admin/calendarRosterMatch";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import {
  addDays,
  buildMonthGrid,
  buildWeekGrid,
  monthLabel,
  monthOf,
  monthRange,
  parseMonthParam,
  parseWeekParam,
  shiftMonth,
  shiftWeek,
  todayInIsrael,
  weekLabel,
  weekRange,
  weekStartOf,
} from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "לוח שנה" };

const CALENDAR_PATH = "/instructor/calendar";

export default async function InstructorCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; week?: string }>;
}) {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const { month: monthParam, view: viewParam, week: weekParam } =
    await searchParams;
  const today = todayInIsrael();
  const currentMonth = monthOf(today);
  const currentWeek = weekStartOf(today);
  const view: CalendarView = viewParam === "week" ? "week" : "month";

  const month = parseMonthParam(monthParam, currentMonth);
  const weekStart = parseWeekParam(weekParam, today);
  const { start, end } = periodQueryRange(view, month, weekStart);

  const weekForMonthToggle = weekStartOf(
    month === currentMonth ? today : `${month}-01`
  );
  const monthForWeekToggle = monthOf(addDays(weekStart, 3));

  if (!instructor) {
    return (
      <EmptyState
        title="אין רשומת מדריך משויכת לחשבון"
        description="כשישויך פרופיל מדריך לחשבון, לוח השנה יציג כאן את החוגים."
        icon="📅"
      />
    );
  }

  const supabase = await createClient();
  const [{ data: ownedClasses }, { data: assignedSlots }] = await Promise.all([
    supabase.from("classes").select("id").eq("instructor_id", instructor.id),
    supabase
      .from("class_weekly_slots")
      .select("id, class_id")
      .eq("instructor_id", instructor.id),
  ]);

  const classIds = [
    ...new Set([
      ...(ownedClasses ?? []).map((row) => row.id),
      ...(assignedSlots ?? []).map((slot) => slot.class_id),
    ]),
  ];

  const ownershipFilter = [
    classIds.length > 0 ? `class_id.in.(${classIds.join(",")})` : null,
    `substitute_instructor_id.eq.${instructor.id}`,
  ]
    .filter(Boolean)
    .join(",");

  const [{ data: sessions }, { data: enrollments }, { data: weeklySlots }] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select(
          "id, class_id, weekly_slot_id, session_date, start_time, end_time, status, notes, substitute_instructor_id, substitute:instructors!class_sessions_substitute_instructor_id_fkey(full_name), classes(id, title, category, capacity, status, instructor_id, booking_mode, pick_one_slot, instructors(full_name))"
        )
        .or(ownershipFilter)
        .gte("session_date", start)
        .lte("session_date", end)
        .order("session_date")
        .order("start_time"),
      supabase
        .from("enrollments")
        .select(
          "class_id, weekly_slot_id, session_id, status, payment_status, admin_assigned, payments(status, payment_method, external_reference, office_collection)"
        )
        .eq("type", "class")
        .in("status", ["active", "pending"])
        .in("class_id", classIds.length > 0 ? classIds : [instructor.id]),
      supabase
        .from("class_weekly_slots")
        .select("id, instructor_id, instructors(full_name)")
        .in("class_id", classIds.length > 0 ? classIds : [instructor.id]),
    ]);

  const slotInstructorById = new Map(
    (weeklySlots ?? []).map((slot) => [
      slot.id,
      {
        instructorId: slot.instructor_id,
        instructorName: slot.instructors?.full_name ?? null,
      },
    ])
  );

  const enrollmentsByClass = new Map<string, NonNullable<typeof enrollments>>();
  for (const enrollment of enrollments ?? []) {
    if (!enrollment.class_id) continue;
    const list = enrollmentsByClass.get(enrollment.class_id);
    if (list) list.push(enrollment);
    else enrollmentsByClass.set(enrollment.class_id, [enrollment]);
  }

  const calendarSessions: CalendarSession[] = (sessions ?? []).flatMap(
    (session) => {
      const cls = session.classes;
      if (!cls) return [];

      return [
        {
          id: session.id,
          kind: "class" as const,
          classId: session.class_id,
          title: cls.title,
          category: cls.category,
          instructorId:
            (session.weekly_slot_id
              ? slotInstructorById.get(session.weekly_slot_id)?.instructorId
              : null) ?? cls.instructor_id,
          instructor:
            (session.weekly_slot_id
              ? slotInstructorById.get(session.weekly_slot_id)?.instructorName
              : null) ??
            cls.instructors?.full_name ??
            null,
          substituteInstructorId: session.substitute_instructor_id,
          substituteInstructor: session.substitute?.full_name ?? null,
          date: session.session_date,
          startTime: session.start_time.slice(0, 5),
          endTime: session.end_time.slice(0, 5),
          status: session.status,
          notes: session.notes,
          capacity: cls.capacity,
          registered: (
            enrollmentsByClass.get(session.class_id) ?? []
          ).filter((row) =>
            enrollmentMatchesCalendarSession(row, {
              sessionId: session.id,
              weeklySlotId: session.weekly_slot_id,
              bookingMode: cls.booking_mode,
              pickOneSlot: cls.pick_one_slot,
            })
          ).length,
          weeklySlotId: session.weekly_slot_id,
          bookingMode: cls.booking_mode,
          pickOneSlot: cls.pick_one_slot,
        },
      ];
    }
  );

  return (
    <ClassCalendar
      mode="instructor"
      view={view}
      periodTitle={view === "week" ? weekLabel(weekStart) : monthLabel(month)}
      previousHref={
        view === "week"
          ? weekHref(shiftWeek(weekStart, -1), currentWeek)
          : monthHref(shiftMonth(month, -1), currentMonth)
      }
      nextHref={
        view === "week"
          ? weekHref(shiftWeek(weekStart, 1), currentWeek)
          : monthHref(shiftMonth(month, 1), currentMonth)
      }
      todayHref={
        view === "week" ? `${CALENDAR_PATH}?view=week` : CALENDAR_PATH
      }
      isCurrentPeriod={
        view === "week" ? weekStart === currentWeek : month === currentMonth
      }
      previousLabel={view === "week" ? "השבוע הקודם" : "החודש הקודם"}
      nextLabel={view === "week" ? "השבוע הבא" : "החודש הבא"}
      monthViewHref={monthHref(
        view === "week" ? monthForWeekToggle : month,
        currentMonth
      )}
      weekViewHref={weekHref(
        view === "month" ? weekForMonthToggle : weekStart,
        currentWeek
      )}
      today={today}
      days={
        view === "week"
          ? buildWeekGrid(weekStart, today)
          : buildMonthGrid(month, today)
      }
      sessions={calendarSessions}
    />
  );
}

function periodQueryRange(
  view: CalendarView,
  month: string,
  weekStart: string
): { start: string; end: string } {
  if (view !== "week") return monthRange(month);

  const week = weekRange(weekStart);
  const monthEnd = monthRange(monthOf(addDays(weekStart, 3))).end;
  return {
    start: week.start,
    end: monthEnd > week.end ? monthEnd : week.end,
  };
}

function monthHref(month: string, currentMonth: string) {
  return month === currentMonth
    ? CALENDAR_PATH
    : `${CALENDAR_PATH}?month=${month}`;
}

function weekHref(weekStart: string, currentWeek: string) {
  return weekStart === currentWeek
    ? `${CALENDAR_PATH}?view=week`
    : `${CALENDAR_PATH}?view=week&week=${weekStart}`;
}
