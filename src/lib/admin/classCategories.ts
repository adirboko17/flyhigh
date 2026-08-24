import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function matchCategoryName(
  names: string[],
  candidate: string
): string | null {
  const needle = normalizeCategoryName(candidate).toLowerCase();
  if (!needle) return null;
  return (
    names.find((name) => normalizeCategoryName(name).toLowerCase() === needle) ??
    null
  );
}

export function defaultClassCategory(
  existing: string | null | undefined,
  names: string[]
): string {
  const current = existing?.trim();
  if (current) return current;
  return matchCategoryName(names, "שחייה") ?? names[0] ?? "";
}

export function sortCategoryNames(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, "he"));
}

export async function addClassCategory(
  supabase: SupabaseClient<Database>,
  name: string
): Promise<{ name: string | null; error: string | null }> {
  const trimmed = normalizeCategoryName(name);
  if (trimmed.length < 1) {
    return { name: null, error: "נא להזין שם קטגוריה." };
  }
  if (trimmed.length > 80) {
    return { name: null, error: "שם הקטגוריה ארוך מדי (עד 80 תווים)." };
  }

  const { data, error } = await supabase
    .from("class_categories")
    .insert({ name: trimmed })
    .select("name")
    .single();

  if (!error && data) return { name: data.name, error: null };

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("class_categories")
      .select("name");
    const match = matchCategoryName(
      (existing ?? []).map((row) => row.name),
      trimmed
    );
    if (match) return { name: match, error: null };
  }

  return { name: null, error: "לא הצלחנו להוסיף את הקטגוריה. נסו שוב." };
}
