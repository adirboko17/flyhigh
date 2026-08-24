import { TracksManager } from "@/components/admin/TracksManager";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "מנויים וכניסות" };

export default async function AdminTracksPage() {
  const supabase = await createAdminDataClient();

  const [{ data: programs }, { data: passes }, { data: privateLessons }] =
    await Promise.all([
      supabase
        .from("programs")
        .select(
          "id, title, description, price, duration_months, kind, status, price_tiers, extra_half_hour_price"
        )
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
