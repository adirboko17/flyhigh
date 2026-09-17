"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import { attendanceRecordName } from "@/lib/attendance/students";
import type { Enums } from "@/types";

export type CustomerAttendanceRecord = {
  id: string;
  date: string;
  year: number;
  status: Enums<"attendance_status">;
  notes: string | null;
  sessionTime: string | null;
  classId: string;
  classTitle: string;
  personKey: string;
  personName: string;
};

function yearFromDate(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

function sessionTimeLabel(
  session: { start_time: string | null; end_time: string | null } | null
): string | null {
  const start = session?.start_time?.slice(0, 5);
  if (!start) return null;
  const end = session?.end_time?.slice(0, 5);
  return end ? `${start}–${end}` : start;
}

function appointmentRecord(input: {
  id: string;
  date: string;
  status: Enums<"attendance_status">;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  classId: string;
  classTitle: string;
  childId: string | null;
  parentId: string;
  childName: string | null;
  parentName: string | null;
}): CustomerAttendanceRecord {
  return {
    id: input.id,
    date: input.date,
    year: yearFromDate(input.date),
    status: input.status,
    notes: input.notes?.trim() || null,
    sessionTime: sessionTimeLabel({
      start_time: input.startTime,
      end_time: input.endTime,
    }),
    classId: input.classId,
    classTitle: input.classTitle,
    personKey: input.childId ?? input.parentId,
    personName: attendanceRecordName(input.childName, input.parentName),
  };
}

export async function loadCustomerAttendance(
  parentId: string
): Promise<CustomerAttendanceRecord[]> {
  const supabase = await createAdminDataClient();

  const { data: children } = await supabase
    .from("children")
    .select("id")
    .eq("parent_id", parentId);

  const childIds = (children ?? []).map((child) => child.id);
  const filters = [`parent_id.eq.${parentId}`];
  if (childIds.length > 0) {
    filters.push(`child_id.in.(${childIds.join(",")})`);
  }
  const familyFilter = filters.join(",");

  const [
    { data, error },
    { data: lessonRows },
    { data: activityRows },
    { data: passRows },
  ] = await Promise.all([
    supabase
      .from("attendance")
      .select(
        "id, date, status, notes, class_id, child_id, parent_id, children(full_name), classes(title), profiles(full_name), class_sessions(start_time, end_time)"
      )
      .or(familyFilter)
      .order("date", { ascending: false }),
    supabase
      .from("private_lesson_slots")
      .select(
        "id, session_date, start_time, end_time, attendance_status, notes, child_id, parent_id, private_lesson_id, children(full_name), profiles(full_name), private_lessons(title)"
      )
      .or(familyFilter)
      .not("attendance_status", "is", null)
      .eq("status", "scheduled"),
    supabase
      .from("activity_bookings")
      .select(
        "id, session_date, start_time, end_time, attendance_status, notes, child_id, parent_id, program_id, children(full_name), profiles(full_name), programs(title)"
      )
      .or(familyFilter)
      .not("attendance_status", "is", null)
      .eq("status", "scheduled"),
    supabase
      .from("pool_pass_bookings")
      .select(
        "id, session_date, start_time, end_time, attendance_status, notes, child_id, parent_id, pool_pass_id, children(full_name), profiles(full_name), pool_passes(title)"
      )
      .or(familyFilter)
      .not("attendance_status", "is", null)
      .eq("status", "scheduled"),
  ]);

  if (error) {
    console.error("loadCustomerAttendance", error);
    throw new Error("לא הצלחנו לטעון את הנוכחות.");
  }

  const classRows = (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    year: yearFromDate(row.date),
    status: row.status,
    notes: row.notes?.trim() || null,
    sessionTime: sessionTimeLabel(row.class_sessions),
    classId: row.class_id,
    classTitle: row.classes?.title?.trim() || "חוג",
    personKey: row.child_id ?? row.parent_id ?? row.id,
    personName: attendanceRecordName(
      row.children?.full_name,
      row.profiles?.full_name
    ),
  }));

  const appointmentRows: CustomerAttendanceRecord[] = [];

  for (const row of lessonRows ?? []) {
    if (!row.session_date || !row.attendance_status) continue;
    appointmentRows.push(
      appointmentRecord({
        id: row.id,
        date: row.session_date,
        status: row.attendance_status,
        notes: row.notes,
        startTime: row.start_time,
        endTime: row.end_time,
        classId: `private_lesson:${row.private_lesson_id}`,
        classTitle: row.private_lessons?.title?.trim() || "שיעור פרטי",
        childId: row.child_id,
        parentId: row.parent_id,
        childName: row.children?.full_name ?? null,
        parentName: row.profiles?.full_name ?? null,
      })
    );
  }

  for (const row of activityRows ?? []) {
    if (!row.session_date || !row.attendance_status) continue;
    appointmentRows.push(
      appointmentRecord({
        id: row.id,
        date: row.session_date,
        status: row.attendance_status,
        notes: row.notes,
        startTime: row.start_time,
        endTime: row.end_time,
        classId: `program:${row.program_id}`,
        classTitle: row.programs?.title?.trim() || "פעילות",
        childId: row.child_id,
        parentId: row.parent_id,
        childName: row.children?.full_name ?? null,
        parentName: row.profiles?.full_name ?? null,
      })
    );
  }

  for (const row of passRows ?? []) {
    if (!row.session_date || !row.attendance_status) continue;
    appointmentRows.push(
      appointmentRecord({
        id: row.id,
        date: row.session_date,
        status: row.attendance_status,
        notes: row.notes,
        startTime: row.start_time,
        endTime: row.end_time,
        classId: `pool_pass:${row.pool_pass_id}`,
        classTitle: row.pool_passes?.title?.trim() || "כרטיסייה",
        childId: row.child_id,
        parentId: row.parent_id,
        childName: row.children?.full_name ?? null,
        parentName: row.profiles?.full_name ?? null,
      })
    );
  }

  return [...classRows, ...appointmentRows].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}
