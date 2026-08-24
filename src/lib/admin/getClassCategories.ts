import { sortCategoryNames } from "@/lib/admin/classCategories";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export async function getClassCategories(): Promise<string[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("class_categories")
    .select("name")
    .order("name");

  return sortCategoryNames((data ?? []).map((row) => row.name));
}
