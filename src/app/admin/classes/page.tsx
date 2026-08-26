import {
  ClassList,
  type AdminClassAttendance,
  type AdminClassRow,
} from "@/components/admin/ClassList";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { getHomeFeaturedClassIds } from "@/lib/admin/featuredClasses";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";

export const metadata = { title: "ניהול חוגים" };

export default async function AdminClassesPage() {
  const supabase = await createAdminDataClient();

  // רשימה קלה: מטא־דאטה + ספירות. הרשימות המלאות נטענות בפתיחת הפאנל.
  const [
    { data: classes },
    { data: enrollmentCounts },
    { data: waitlistCounts },
    { data: slotRows },
    instructors,
    featuredClassIds,
  ] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, category, level, description, image_url, day_of_week, start_time, end_time, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, price, billing_months, planned_session_count, pick_one_slot, capacity, status, schedule_type, start_date, end_date, sibling_discount_tiers, instructor_id, interest_only, instructors(full_name, gender)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select(
          "class_id, weekly_slot_id, status, payment_status, payments(status, payment_method, external_reference)"
        )
        .eq("type", "class")
        .not("class_id", "is", null)
        .in("status", ["active", "pending"]),
      supabase
        .from("waitlist")
        .select("class_id, weekly_slot_id")
        .in("status", ["waiting", "offered"]),
      supabase
        .from("class_weekly_slots")
        .select("id, class_id, day_of_week, start_time, end_time, gender_policy")
        .order("day_of_week")
        .order("start_time"),
      getClassInstructorOptions(),
      getHomeFeaturedClassIds(),
    ]);

  const registeredByClass = new Map<string, number>();
  const registeredBySlot = new Map<string, number>();
  for (const row of enrollmentCounts ?? []) {
    if (!row.class_id || !enrollmentHoldsSeat(row)) continue;
    registeredByClass.set(
      row.class_id,
      (registeredByClass.get(row.class_id) ?? 0) + 1
    );
    if (row.weekly_slot_id) {
      registeredBySlot.set(
        row.weekly_slot_id,
        (registeredBySlot.get(row.weekly_slot_id) ?? 0) + 1
      );
    }
  }

  const waitlistByClass = new Map<string, number>();
  const waitlistBySlot = new Map<string, number>();
  for (const row of waitlistCounts ?? []) {
    if (!row.class_id) continue;
    waitlistByClass.set(
      row.class_id,
      (waitlistByClass.get(row.class_id) ?? 0) + 1
    );
    if (row.weekly_slot_id) {
      waitlistBySlot.set(
        row.weekly_slot_id,
        (waitlistBySlot.get(row.weekly_slot_id) ?? 0) + 1
      );
    }
  }

  const slotsByClass = new Map<string, AdminClassRow["slots"]>();
  for (const slot of slotRows ?? []) {
    const list = slotsByClass.get(slot.class_id) ?? [];
    list.push({
      id: slot.id,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      gender_policy: slot.gender_policy,
      registeredCount: registeredBySlot.get(slot.id) ?? 0,
      waitlistCount: waitlistBySlot.get(slot.id) ?? 0,
    });
    slotsByClass.set(slot.class_id, list);
  }

  const rows: AdminClassRow[] = (classes ?? []).map((cls) => ({
    ...cls,
    registeredCount: registeredByClass.get(cls.id) ?? 0,
    waitlistCount: waitlistByClass.get(cls.id) ?? 0,
    slots: slotsByClass.get(cls.id) ?? [],
    enrollments: [],
    waitlist: [],
    attendance: [] as AdminClassAttendance[],
  }));

  return (
    <ClassList
      classes={rows}
      instructors={instructors}
      featuredClassIds={featuredClassIds}
    />
  );
}
