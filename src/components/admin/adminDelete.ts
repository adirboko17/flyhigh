import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

const FK_MESSAGE =
  "לא ניתן למחוק — ייתכן שיש רשומות מקושרות (הרשמות, חוגים וכו').";

export async function deleteAdminRow(
  supabase: Client,
  table: "classes" | "programs" | "pool_passes" | "instructors" | "coupons",
  id: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    if (error.code === "23503") return { error: FK_MESSAGE };
    return { error: "אירעה שגיאה במחיקה. נסו שוב." };
  }

  return {};
}
