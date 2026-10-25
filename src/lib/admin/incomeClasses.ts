import { createAdminDataClient } from "@/lib/admin/dataClient";

export type IncomeClassOption = {
  id: string;
  title: string;
  category: string | null;
  inactive: boolean;
};

export async function loadIncomeClassOptions(): Promise<IncomeClassOption[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("classes")
    .select("id, title, category, status")
    .order("title", { ascending: true });

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      title: row.title.trim() || "חוג",
      category: row.category?.trim() || null,
      inactive: row.status === "inactive",
    }))
    .sort((a, b) => {
      const left = a.category ?? "";
      const right = b.category ?? "";
      if (!left !== !right) return left ? -1 : 1;
      const category = left.localeCompare(right, "he");
      if (category !== 0) return category;
      if (a.inactive !== b.inactive) return a.inactive ? 1 : -1;
      return a.title.localeCompare(b.title, "he");
    });
}
