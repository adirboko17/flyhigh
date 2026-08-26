"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import type {
  AdminClassAttendance,
  AdminClassEnrollment,
  AdminClassRow,
  AdminClassWaitlistEntry,
} from "@/components/admin/ClassList";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";

const ENROLLMENT_SELECT =
  "id, class_id, parent_id, child_id, weekly_slot_id, admin_assigned, status, payment_status, created_at, children(full_name, birth_date), profiles(full_name, phone), payments(status, payment_method, external_reference)";

const WAITLIST_SELECT =
  "id, class_id, parent_id, child_id, weekly_slot_id, status, created_at, children(full_name), profiles(full_name, phone)";

export async function loadClassRoster(classId: string): Promise<{
  enrollments: AdminClassEnrollment[];
  waitlist: AdminClassWaitlistEntry[];
}> {
  const supabase = await createAdminDataClient();

  const [{ data: enrollments }, { data: waitlist }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(ENROLLMENT_SELECT)
      .eq("type", "class")
      .eq("class_id", classId)
      .in("status", ["active", "pending", "cancelled"])
      .order("created_at", { ascending: false }),
    supabase
      .from("waitlist")
      .select(WAITLIST_SELECT)
      .eq("class_id", classId)
      .in("status", ["waiting", "offered"])
      .order("created_at"),
  ]);

  return {
    enrollments: (enrollments ?? []) as AdminClassEnrollment[],
    waitlist: (waitlist ?? []) as AdminClassWaitlistEntry[],
  };
}

const CLASS_SUMMARY_SELECT =
  "id, title, category, level, description, image_url, day_of_week, start_time, end_time, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, price, billing_months, planned_session_count, pick_one_slot, capacity, status, schedule_type, start_date, end_date, sibling_discount_tiers, instructor_id, interest_only, instructors(full_name, gender)";

/** מטא־דאטה + ספירות לחלון הקיצור (נרשמים ונוכחות נטענים בנפרד). */
export async function loadAdminClassSummary(
  classId: string
): Promise<AdminClassRow | null> {
  const supabase = await createAdminDataClient();

  const [
    { data: cls },
    { data: enrollmentCounts },
    { data: waitlistCounts },
    { data: slotRows },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(CLASS_SUMMARY_SELECT)
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select(
        "weekly_slot_id, status, payment_status, payments(status, payment_method, external_reference)"
      )
      .eq("type", "class")
      .eq("class_id", classId)
      .in("status", ["active", "pending"]),
    supabase
      .from("waitlist")
      .select("weekly_slot_id")
      .eq("class_id", classId)
      .in("status", ["waiting", "offered"]),
    supabase
      .from("class_weekly_slots")
      .select("id, day_of_week, start_time, end_time, gender_policy")
      .eq("class_id", classId)
      .order("day_of_week")
      .order("start_time"),
  ]);

  if (!cls) return null;

  let registeredCount = 0;
  const registeredBySlot = new Map<string, number>();
  for (const row of enrollmentCounts ?? []) {
    if (!enrollmentHoldsSeat(row)) continue;
    registeredCount += 1;
    if (row.weekly_slot_id) {
      registeredBySlot.set(
        row.weekly_slot_id,
        (registeredBySlot.get(row.weekly_slot_id) ?? 0) + 1
      );
    }
  }

  let waitlistCount = 0;
  const waitlistBySlot = new Map<string, number>();
  for (const row of waitlistCounts ?? []) {
    waitlistCount += 1;
    if (row.weekly_slot_id) {
      waitlistBySlot.set(
        row.weekly_slot_id,
        (waitlistBySlot.get(row.weekly_slot_id) ?? 0) + 1
      );
    }
  }

  return {
    ...cls,
    registeredCount,
    waitlistCount,
    slots: (slotRows ?? []).map((slot) => ({
      id: slot.id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      gender_policy: slot.gender_policy,
      registeredCount: registeredBySlot.get(slot.id) ?? 0,
      waitlistCount: waitlistBySlot.get(slot.id) ?? 0,
    })),
    enrollments: [],
    waitlist: [],
    attendance: [],
  };
}

export async function loadClassAttendance(
  classId: string
): Promise<AdminClassAttendance[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("attendance")
    .select("id, class_id, date, status, children(full_name), instructors(full_name)")
    .eq("class_id", classId)
    .order("date", { ascending: false });

  return (data ?? []) as AdminClassAttendance[];
}
