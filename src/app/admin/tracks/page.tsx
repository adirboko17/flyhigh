import { TracksManager } from "@/components/admin/TracksManager";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "מנויים וכניסות" };

export default async function AdminTracksPage() {
  const supabase = await createAdminDataClient();

  const [
    { data: programs },
    { data: passes },
    { data: privateLessons },
    instructors,
  ] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, title, description, price, duration_months, duration_minutes, kind, status, price_tiers, extra_half_hour_price, requires_schedule, instructor_id"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("pool_passes")
      .select(
        "id, title, description, entries_count, price, status, requires_schedule, instructor_id"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("private_lessons")
      .select(
        "id, title, description, duration_minutes, lessons_count, price, status, requires_schedule, instructor_id"
      )
      .order("created_at", { ascending: false }),
    getClassInstructorOptions(),
  ]);

  return (
    <TracksManager
      programs={programs ?? []}
      passes={passes ?? []}
      privateLessons={privateLessons ?? []}
      instructors={instructors}
    />
  );
}
