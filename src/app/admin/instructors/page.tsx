import { InstructorList } from "@/components/admin/InstructorList";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "מדריכים" };

export default async function AdminInstructorsPage() {
  const supabase = await createAdminDataClient();

  const [{ data: instructors }, { data: classes }] = await Promise.all([
    supabase
      .from("instructors")
      .select("id, full_name, gender, phone, hourly_rate, monthly_salary, pay_type, status, profile_id, profiles(email)")
      .order("created_at", { ascending: false }),
    supabase.from("classes").select("instructor_id"),
  ]);

  const classCount = new Map<string, number>();
  (classes ?? []).forEach((c) => {
    if (c.instructor_id) {
      classCount.set(
        c.instructor_id,
        (classCount.get(c.instructor_id) ?? 0) + 1
      );
    }
  });

  const rows = (instructors ?? []).map(({ profiles, ...i }) => ({
    ...i,
    email: profiles?.email ?? null,
    classCount: classCount.get(i.id) ?? 0,
  }));

  return <InstructorList instructors={rows} />;
}
