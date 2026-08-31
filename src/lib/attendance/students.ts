import { participantDisplayName } from "@/lib/enrollment/participant";

export type AttendanceStudent = {
  id: string;
  full_name: string;
  weekly_slot_id?: string | null;
  childId: string | null;
  parentId: string | null;
};

export function attendanceStudentsFromEnrollments(
  enrollments: Array<{
    child_id: string | null;
    parent_id: string;
    weekly_slot_id?: string | null;
    children?: { full_name: string } | null;
    profiles?: { full_name: string } | null;
  }>
): AttendanceStudent[] {
  const seen = new Set<string>();
  const list: AttendanceStudent[] = [];

  for (const enrollment of enrollments) {
    const name = participantDisplayName(
      enrollment.children?.full_name,
      enrollment.profiles?.full_name
    );
    const id = enrollment.child_id ?? enrollment.parent_id;
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      full_name: name,
      weekly_slot_id: enrollment.weekly_slot_id ?? null,
      childId: enrollment.child_id,
      parentId: enrollment.child_id ? null : enrollment.parent_id,
    });
  }

  return list;
}

export function attendanceRecordName(
  childName: string | null | undefined,
  parentName: string | null | undefined
): string {
  return participantDisplayName(childName, parentName, "—");
}

export function attendanceRecordKey(row: {
  child_id?: string | null;
  parent_id?: string | null;
}): string | null {
  return row.child_id ?? row.parent_id ?? null;
}
