import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/types/database.types";

type ClassStatus = Enums<"class_status">;

export async function setClassStatus(
  supabase: SupabaseClient<Database>,
  classId: string,
  nextStatus: "active" | "inactive"
): Promise<{ error?: string }> {
  let status: ClassStatus = nextStatus;

  if (nextStatus === "active") {
    const [{ data: cls }, { count }] = await Promise.all([
      supabase.from("classes").select("capacity").eq("id", classId).single(),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", classId)
        .in("status", ["active", "pending"]),
    ]);

    if (cls && count != null && count >= cls.capacity) {
      status = "full";
    }
  }

  const { error } = await supabase
    .from("classes")
    .update({ status })
    .eq("id", classId);

  if (error) {
    return { error: "עדכון הסטטוס נכשל. נסו שוב." };
  }

  return {};
}
