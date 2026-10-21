import type { Database, Enums } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * רישום שנחשב לילד שכבר בחוג לצורך הנחת אחים.
 * תשלום שלא הושלם (כולל עגלה נטושה) לא נספר — הלקוח נרשם רק אחרי שהתשלום עבר,
 * או כשההרשמה הוגדרה מראש בלי חיוב.
 */
export const SIBLING_DISCOUNT_PAYMENT_STATUSES = [
  "paid",
  "partial",
  "not_required",
  "no_charge",
] as const satisfies readonly Enums<"enrollment_payment_status">[];

const COUNTED_PAYMENT_STATUSES = new Set<Enums<"enrollment_payment_status">>(
  SIBLING_DISCOUNT_PAYMENT_STATUSES
);

export function enrollmentCountsForSiblingDiscount(
  paymentStatus: Enums<"enrollment_payment_status"> | null | undefined
): boolean {
  return (
    paymentStatus != null && COUNTED_PAYMENT_STATUSES.has(paymentStatus)
  );
}

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
  is_trial?: boolean | null;
  payment_status?: Enums<"enrollment_payment_status"> | null;
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
    if (!row.child_id || row.is_trial) continue;
    if (!enrollmentCountsForSiblingDiscount(row.payment_status)) continue;
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
    .select("child_id, class_id, is_trial, payment_status, classes(category)")
    .eq("parent_id", parentId)
    .eq("type", "class")
    .neq("status", "cancelled");

  return familyChildIdsInCategory(data ?? [], classId, category);
}
