import {
  ClassList,
  type AdminClassAttendance,
  type AdminClassRow,
} from "@/components/admin/ClassList";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "ניהול חוגים" };

export default async function AdminClassesPage() {
  const supabase = await createAdminDataClient();

  // רשימה קלה: מטא־דאטה + ספירות. הרשימות המלאות נטענות בפתיחת הפאנל.
  const [{ data: classes }, { data: enrollmentCounts }, { data: waitlistCounts }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, category, level, description, image_url, day_of_week, start_time, end_time, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, price, capacity, status, schedule_type, start_date, end_date, sibling_discount_tiers, instructor_id, instructors(full_name)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select("class_id, status")
        .eq("type", "class")
        .not("class_id", "is", null)
        .in("status", ["active", "pending"]),
      supabase
        .from("waitlist")
        .select("class_id")
        .in("status", ["waiting", "offered"]),
    ]);

  const registeredByClass = new Map<string, number>();
  for (const row of enrollmentCounts ?? []) {
    if (!row.class_id) continue;
    registeredByClass.set(
      row.class_id,
      (registeredByClass.get(row.class_id) ?? 0) + 1
    );
  }

  const waitlistByClass = new Map<string, number>();
  for (const row of waitlistCounts ?? []) {
    if (!row.class_id) continue;
    waitlistByClass.set(
      row.class_id,
      (waitlistByClass.get(row.class_id) ?? 0) + 1
    );
  }

  const rows: AdminClassRow[] = (classes ?? []).map((cls) => ({
    ...cls,
    registeredCount: registeredByClass.get(cls.id) ?? 0,
    waitlistCount: waitlistByClass.get(cls.id) ?? 0,
    enrollments: [],
    waitlist: [],
    attendance: [] as AdminClassAttendance[],
  }));

  return <ClassList classes={rows} />;
}
