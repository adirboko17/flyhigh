import { createAdminDataClient } from "@/lib/admin/dataClient";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";
import {
  participantDisplayName,
  participantSecondaryLine,
} from "@/lib/enrollment/participant";
import { unassignedInstructorLabel } from "@/lib/instructors/labels";
import { uniqueClassInstructorIds } from "@/lib/instructors/sessionInstructor";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import type { Enums } from "@/types/database.types";

export type ClassOverviewRow = {
  id: string;
  classId: string;
  classTitle: string;
  slotId: string | null;
  slotLabel: string;
  slotSort: string;
  attendsAllSlots: boolean;
  instructorIds: string[];
  instructorLabel: string;
  participantName: string;
  parentLine: string | null;
  status: Enums<"enrollment_status">;
  paymentStatus: Enums<"enrollment_payment_status">;
};

export type ClassOverviewClassOption = {
  id: string;
  title: string;
};

export type ClassOverviewSlotOption = {
  id: string;
  classId: string;
  label: string;
};

export type ClassOverviewInstructorOption = {
  id: string;
  fullName: string;
};

export type ClassOverviewData = {
  rows: ClassOverviewRow[];
  classes: ClassOverviewClassOption[];
  slots: ClassOverviewSlotOption[];
  instructors: ClassOverviewInstructorOption[];
};

type SlotRow = {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  gender_policy: Enums<"class_gender_policy">;
  instructor_id: string | null;
};

function slotLabel(slot: SlotRow) {
  return formatWeeklySlotLabel(
    slot.day_of_week,
    slot.start_time,
    slot.end_time,
    slot.gender_policy
  );
}

function slotSortKey(dayOfWeek: number, startTime: string) {
  return `${String(dayOfWeek).padStart(2, "0")}|${startTime.slice(0, 5)}`;
}

function instructorLabelFor(
  ids: string[],
  names: Map<string, string>
): string {
  const labels = ids
    .map((id) => names.get(id)?.trim())
    .filter((name): name is string => Boolean(name));
  if (labels.length === 0) return unassignedInstructorLabel();
  return [...new Set(labels)].join(" · ");
}

export async function loadClassOverview(): Promise<ClassOverviewData> {
  const supabase = await createAdminDataClient();

  const [
    { data: enrollments },
    { data: classRows },
    { data: slotRows },
    { data: instructorRows },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, class_id, weekly_slot_id, session_id, is_trial, status, payment_status, children(full_name), profiles(full_name, phone), payments(status, payment_method, external_reference, office_collection), class_sessions(session_date, start_time, end_time)"
      )
      .eq("type", "class")
      .in("status", ["active", "pending"])
      .not("class_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select(
        "id, title, day_of_week, start_time, end_time, instructor_id, interest_only, pick_one_slot, booking_mode, gender_policy"
      )
      .order("title"),
    supabase
      .from("class_weekly_slots")
      .select(
        "id, class_id, day_of_week, start_time, end_time, gender_policy, instructor_id"
      )
      .order("day_of_week")
      .order("start_time"),
    supabase.from("instructors").select("id, full_name").order("full_name"),
  ]);

  const instructorNames = new Map(
    (instructorRows ?? []).map((instructor) => [
      instructor.id,
      instructor.full_name,
    ])
  );

  const classesById = new Map((classRows ?? []).map((cls) => [cls.id, cls]));
  const slotsById = new Map((slotRows ?? []).map((slot) => [slot.id, slot]));
  const slotsByClass = new Map<string, SlotRow[]>();
  for (const slot of slotRows ?? []) {
    const list = slotsByClass.get(slot.class_id) ?? [];
    list.push(slot);
    slotsByClass.set(slot.class_id, list);
  }

  const rows: ClassOverviewRow[] = [];

  for (const enrollment of enrollments ?? []) {
    if (!enrollment.class_id || !enrollmentHoldsSeat(enrollment)) continue;
    const cls = classesById.get(enrollment.class_id);
    if (!cls) continue;

    const classSlots = slotsByClass.get(cls.id) ?? [];
    const assignedSlot = enrollment.weekly_slot_id
      ? slotsById.get(enrollment.weekly_slot_id)
      : undefined;
    const attendsAllSlots =
      !enrollment.weekly_slot_id && classSlots.length > 1 && !cls.pick_one_slot;
    const bookedSession = Array.isArray(enrollment.class_sessions)
      ? enrollment.class_sessions[0]
      : enrollment.class_sessions;

    let slotLabelText: string;
    let slotSort: string;
    if (bookedSession?.session_date) {
      slotLabelText = `${bookedSession.session_date} · ${String(bookedSession.start_time).slice(0, 5)}`;
      slotSort = `${bookedSession.session_date}|${bookedSession.start_time}`;
    } else if (assignedSlot) {
      slotLabelText = slotLabel(assignedSlot);
      slotSort = slotSortKey(assignedSlot.day_of_week, assignedSlot.start_time);
    } else if (classSlots.length === 1) {
      slotLabelText = slotLabel(classSlots[0]!);
      slotSort = slotSortKey(
        classSlots[0]!.day_of_week,
        classSlots[0]!.start_time
      );
    } else if (classSlots.length > 1) {
      slotLabelText = attendsAllSlots ? "כל המועדים" : "ללא מועד";
      slotSort = "99|";
    } else if (cls.interest_only) {
      slotLabelText = "הרשמת עניין";
      slotSort = "98|";
    } else if (cls.day_of_week != null && cls.start_time) {
      slotLabelText = formatWeeklySlotLabel(
        cls.day_of_week,
        cls.start_time,
        cls.end_time ?? cls.start_time,
        cls.gender_policy
      );
      slotSort = slotSortKey(cls.day_of_week, cls.start_time);
    } else {
      slotLabelText = "—";
      slotSort = "99|";
    }

    const instructorIds = assignedSlot
      ? uniqueClassInstructorIds(cls.instructor_id, [assignedSlot.instructor_id])
      : uniqueClassInstructorIds(
          cls.instructor_id,
          classSlots.map((slot) => slot.instructor_id)
        );

    rows.push({
      id: enrollment.id,
      classId: cls.id,
      classTitle: cls.title,
      slotId:
        assignedSlot?.id ??
        (classSlots.length === 1 ? classSlots[0]!.id : null),
      slotLabel: slotLabelText,
      slotSort,
      attendsAllSlots,
      instructorIds,
      instructorLabel: instructorLabelFor(instructorIds, instructorNames),
      participantName: participantDisplayName(
        enrollment.children?.full_name,
        enrollment.profiles?.full_name,
        "—"
      ),
      parentLine: participantSecondaryLine(
        enrollment.children?.full_name,
        enrollment.profiles?.full_name,
        enrollment.profiles?.phone
      ),
      status: enrollment.status,
      paymentStatus: enrollment.payment_status,
    });
  }

  rows.sort(
    (a, b) =>
      a.classTitle.localeCompare(b.classTitle, "he") ||
      a.slotSort.localeCompare(b.slotSort) ||
      a.participantName.localeCompare(b.participantName, "he")
  );

  return {
    rows,
    classes: (classRows ?? []).map((cls) => ({
      id: cls.id,
      title: cls.title,
    })),
    slots: (slotRows ?? []).map((slot) => ({
      id: slot.id,
      classId: slot.class_id,
      label: slotLabel(slot),
    })),
    instructors: (instructorRows ?? []).map((instructor) => ({
      id: instructor.id,
      fullName: instructor.full_name,
    })),
  };
}
