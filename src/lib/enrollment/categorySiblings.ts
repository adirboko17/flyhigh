import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeClassCategory(
  category: string | null | undefined
): string | null {
  const name = category?.trim().replace(/\s+/g, " ") ?? "";
  return name || null;
}

export function categoriesMatch(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  const a = normalizeClassCategory(left);
  const b = normalizeClassCategory(right);
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

type CategoryEnrollmentRow = {
  child_id: string | null;
  class_id: string | null;
  classes:
    | { category: string | null }
    | { category: string | null }[]
    | null;
};

function rowCategory(
  classes: CategoryEnrollmentRow["classes"]
): string | null {
  if (!classes) return null;
  return Array.isArray(classes)
    ? (classes[0]?.category ?? null)
    : classes.category;
}

/** ילדים ייחודיים של המשפחה שכבר רשומים לאותה קטגוריה (או לאותו חוג בלי קטגוריה). */
export function familyChildIdsInCategory(
  rows: CategoryEnrollmentRow[],
  classId: string,
  category: string | null | undefined
): string[] {
  const normalized = normalizeClassCategory(category);
  const unique = new Set<string>();

  for (const row of rows) {
    if (!row.child_id) continue;
    const sameClass = row.class_id === classId;
    const sameCategory = normalized
      ? categoriesMatch(rowCategory(row.classes), normalized) || sameClass
      : sameClass;
    if (sameCategory) unique.add(row.child_id);
  }

  return [...unique];
}

export function countFamilyChildrenInCategory(
  childIds: string[],
  excludeChildIds: Iterable<string> = []
): number {
  const exclude = new Set(excludeChildIds);
  return childIds.filter((id) => !exclude.has(id)).length;
}

export async function listFamilyChildrenInCategory(
  supabase: SupabaseClient<Database>,
  parentId: string,
  classId: string,
  category: string | null | undefined
): Promise<string[]> {
  const { data } = await supabase
    .from("enrollments")
    .select("child_id, class_id, classes(category)")
    .eq("parent_id", parentId)
    .eq("type", "class")
    .neq("status", "cancelled");

  return familyChildIdsInCategory(data ?? [], classId, category);
}
