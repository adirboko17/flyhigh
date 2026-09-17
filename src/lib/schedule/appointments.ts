import type { CalendarSession } from "@/components/admin/ClassCalendar";
import {
  ACTIVITY_CALENDAR_GROUP,
  POOL_PASS_CALENDAR_GROUP,
  PRIVATE_LESSON_CALENDAR_GROUP,
} from "@/lib/schedule/calendarGroups";
import type { AppointmentKind } from "@/lib/schedule/kinds";
import type { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ScheduledAppointment = {
  id: string;
  kind: AppointmentKind;
  title: string;
  sessionDate: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  attendanceStatus: Enums<"attendance_status"> | null;
  parentName: string;
  childName: string | null;
  instructorId: string | null;
  instructorName: string | null;
  peopleCount: number | null;
};

type NamedJoin = { full_name: string | null } | null;
type ProductJoin = {
  title: string | null;
  instructor_id: string | null;
  instructors: NamedJoin;
} | null;

function clientLabel(parentName: string, childName: string | null) {
  return childName ? `${parentName} · ${childName}` : parentName;
}

function clock(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

export function appointmentToCalendarSession(
  row: ScheduledAppointment
): CalendarSession | null {
  const startTime = clock(row.startTime);
  const endTime = clock(row.endTime) ?? startTime;
  if (!startTime || !endTime) return null;

  const people = row.peopleCount ?? 1;
  return {
    id: row.id,
    kind: row.kind,
    classId:
      row.kind === "private_lesson"
        ? PRIVATE_LESSON_CALENDAR_GROUP
        : row.kind === "activity"
          ? ACTIVITY_CALENDAR_GROUP
          : POOL_PASS_CALENDAR_GROUP,
    title: row.title,
    category:
      row.kind === "private_lesson"
        ? "שיעור פרטי"
        : row.kind === "activity"
          ? "פעילות"
          : "כרטיסייה",
    instructorId: row.instructorId,
    instructor: row.instructorName,
    substituteInstructorId: null,
    substituteInstructor: null,
    date: row.sessionDate,
    startTime,
    endTime,
    status: "scheduled",
    notes: row.notes,
    capacity: people,
    registered: people,
    clientLabel:
      row.kind === "activity" && row.peopleCount != null
        ? `${clientLabel(row.parentName, row.childName)} · ${row.peopleCount} ${
            row.peopleCount === 1 ? "משתתף" : "משתתפים"
          }`
        : clientLabel(row.parentName, row.childName),
  };
}

function mapRow(
  kind: AppointmentKind,
  row: {
    id: string;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    attendance_status: Enums<"attendance_status"> | null;
    people_count?: number;
    profiles: NamedJoin;
    children: NamedJoin;
    product: ProductJoin;
  }
): ScheduledAppointment | null {
  if (!row.session_date || !row.start_time) return null;
  return {
    id: row.id,
    kind,
    title:
      row.product?.title ??
      (kind === "private_lesson"
        ? "שיעור פרטי"
        : kind === "activity"
          ? "פעילות"
          : "כרטיסייה"),
    sessionDate: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes,
    attendanceStatus: row.attendance_status,
    parentName: row.profiles?.full_name ?? "לקוח",
    childName: row.children?.full_name ?? null,
    instructorId: row.product?.instructor_id ?? null,
    instructorName: row.product?.instructors?.full_name ?? null,
    peopleCount: row.people_count ?? null,
  };
}

export async function loadScheduledAppointments(
  supabase: Client,
  range: { start: string; end: string }
): Promise<ScheduledAppointment[]> {
  const [{ data: lessons }, { data: activities }, { data: passes }] =
    await Promise.all([
      supabase
        .from("private_lesson_slots")
        .select(
          "id, session_date, start_time, end_time, notes, attendance_status, profiles(full_name), children(full_name), private_lessons(title, instructor_id, instructors(full_name))"
        )
        .eq("status", "scheduled")
        .gte("session_date", range.start)
        .lte("session_date", range.end)
        .order("session_date")
        .order("start_time"),
      supabase
        .from("activity_bookings")
        .select(
          "id, session_date, start_time, end_time, notes, attendance_status, people_count, profiles(full_name), children(full_name), programs(title, instructor_id, instructors(full_name))"
        )
        .eq("status", "scheduled")
        .gte("session_date", range.start)
        .lte("session_date", range.end)
        .order("session_date")
        .order("start_time"),
      supabase
        .from("pool_pass_bookings")
        .select(
          "id, session_date, start_time, end_time, notes, attendance_status, profiles(full_name), children(full_name), pool_passes(title, instructor_id, instructors(full_name))"
        )
        .eq("status", "scheduled")
        .gte("session_date", range.start)
        .lte("session_date", range.end)
        .order("session_date")
        .order("start_time"),
    ]);

  return [
    ...(lessons ?? []).flatMap((row) => {
      const mapped = mapRow("private_lesson", {
        ...row,
        product: row.private_lessons,
      });
      return mapped ? [mapped] : [];
    }),
    ...(activities ?? []).flatMap((row) => {
      const mapped = mapRow("activity", {
        ...row,
        product: row.programs,
      });
      return mapped ? [mapped] : [];
    }),
    ...(passes ?? []).flatMap((row) => {
      const mapped = mapRow("pool_pass", {
        ...row,
        product: row.pool_passes,
      });
      return mapped ? [mapped] : [];
    }),
  ].sort(
    (a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) ||
      a.startTime.localeCompare(b.startTime)
  );
}
