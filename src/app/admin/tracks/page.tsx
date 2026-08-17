import { TracksManager } from "@/components/admin/TracksManager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "מסלולים וכניסות" };

export default async function AdminTracksPage() {
  const supabase = await createClient();

  const [{ data: programs }, { data: passes }, { data: privateLessons }] =
    await Promise.all([
      supabase
        .from("programs")
        .select("id, title, description, price, duration_months, status")
        .order("created_at", { ascending: false }),
      supabase
        .from("pool_passes")
        .select("id, title, description, entries_count, price, status")
        .order("created_at", { ascending: false }),
      supabase
        .from("private_lessons")
        .select("id, title, description, duration_minutes, price, status")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <TracksManager
      programs={programs ?? []}
      passes={passes ?? []}
      privateLessons={privateLessons ?? []}
    />
  );
}
