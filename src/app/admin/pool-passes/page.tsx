import { PoolPassList } from "@/components/admin/PoolPassList";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "כניסות לבריכה" };

export default async function AdminPoolPassesPage() {
  const supabase = await createClient();
  const { data: passes } = await supabase
    .from("pool_passes")
    .select("id, title, description, entries_count, price, status")
    .order("created_at", { ascending: false });

  return <PoolPassList passes={passes ?? []} />;
}
