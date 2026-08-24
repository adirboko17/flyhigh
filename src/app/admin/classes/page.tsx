import {
  ClassList,
  type AdminClassAttendance,
  type AdminClassEnrollment,
  type AdminClassRow,
  type AdminClassWaitlistEntry,
} from "@/components/admin/ClassList";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "ניהול חוגים" };

/** קיבוץ רשומות לפי החוג שאליו הן משויכות. */
function groupByClass<T extends { class_id: string | null }>(rows: T[] | null) {
  const map = new Map<string, T[]>();
  for (const row of rows ?? []) {
    if (!row.class_id) continue;
    const list = map.get(row.class_id);
    if (list) list.push(row);
    else map.set(row.class_id, [row]);
  }
  return map;
}

export default async function AdminClassesPage() {
  const supabase = await createAdminDataClient();

  // רשימת החוגים + נרשמים/המתנה בלבד. נוכחות נטענת בפאנל (חוסך אלפי שורות בכל כניסה).
  const [{ data: classes }, { data: enrollments }, { data: waitlist }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, category, level, description, image_url, day_of_week, start_time, end_time, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, price, capacity, status, schedule_type, start_date, end_date, sibling_discount_tiers, instructor_id, instructors(full_name)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select(
          "id, class_id, parent_id, child_id, admin_assigned, status, payment_status, created_at, children(full_name, birth_date), profiles(full_name, phone)"
        )
        .eq("type", "class")
        .not("class_id", "is", null)
        .in("status", ["active", "pending", "cancelled"])
        .order("created_at", { ascending: false }),
      supabase
        .from("waitlist")
        .select(
          "id, class_id, parent_id, child_id, status, created_at, children(full_name), profiles(full_name, phone)"
        )
        .in("status", ["waiting", "offered"])
        .order("created_at"),
    ]);

  const enrollmentsByClass = groupByClass<AdminClassEnrollment>(
    enrollments as AdminClassEnrollment[] | null
  );
  const waitlistByClass = groupByClass<AdminClassWaitlistEntry>(
    waitlist as AdminClassWaitlistEntry[] | null
  );

  const rows: AdminClassRow[] = (classes ?? []).map((cls) => ({
    ...cls,
    enrollments: enrollmentsByClass.get(cls.id) ?? [],
    waitlist: waitlistByClass.get(cls.id) ?? [],
    attendance: [] as AdminClassAttendance[],
  }));

  return <ClassList classes={rows} />;
}
