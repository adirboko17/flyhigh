import { InstructorList } from "@/components/admin/InstructorList";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "מדריכים" };

export default async function AdminInstructorsPage() {
  const supabase = await createAdminDataClient();

  const [{ data: instructors }, { data: classes }, { data: slotRows }] =
    await Promise.all([
      supabase
        .from("instructors")
        .select("id, full_name, gender, phone, hourly_rate, monthly_salary, pay_type, status, profile_id, profiles(email)")
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, instructor_id"),
      supabase.from("class_weekly_slots").select("class_id, instructor_id"),
    ]);

  const classIdsByInstructor = new Map<string, Set<string>>();
  function addClass(instructorId: string | null, classId: string) {
    if (!instructorId) return;
    const ids = classIdsByInstructor.get(instructorId) ?? new Set<string>();
    ids.add(classId);
    classIdsByInstructor.set(instructorId, ids);
  }
  for (const cls of classes ?? []) addClass(cls.instructor_id, cls.id);
  for (const slot of slotRows ?? []) addClass(slot.instructor_id, slot.class_id);

  const classCount = new Map(
    [...classIdsByInstructor.entries()].map(([id, classesForInstructor]) => [
      id,
      classesForInstructor.size,
    ])
  );

  const rows = (instructors ?? []).map(({ profiles, ...i }) => ({
    ...i,
    email: profiles?.email ?? null,
    classCount: classCount.get(i.id) ?? 0,
  }));

  return <InstructorList instructors={rows} />;
}
