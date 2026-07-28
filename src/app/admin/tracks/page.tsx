import { TracksManager } from "@/components/admin/TracksManager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "מסלולים וכניסות" };

export default async function AdminTracksPage() {
  const supabase = await createClient();

  const [{ data: programs }, { data: passes }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, title, description, price, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("pool_passes")
      .select("id, title, description, entries_count, price, status")
      .order("created_at", { ascending: false }),
  ]);

  return <TracksManager programs={programs ?? []} passes={passes ?? []} />;
}
