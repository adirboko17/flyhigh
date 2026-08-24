import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";

export type ClassInstructorOption = {
  id: string;
  full_name: string;
  /** המנהל המחובר — מוצג בראש הרשימה כ"אני". */
  isSelf?: boolean;
};

/**
 * רשימת מדריכות לטופס חוג, כולל אפשרות לבחור את המנהל המחובר.
 * אם עדיין אין רשומת מדריכה מקושרת לפרופיל המנהל — נוצרת אחת אוטומטית.
 */
export async function getClassInstructorOptions(): Promise<
  ClassInstructorOption[]
> {
  const profile = await requireRole("admin");
  const supabase = await createAdminDataClient();

  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, full_name, profile_id, status")
    .order("full_name");

  const rows = instructors ?? [];
  let self = rows.find((row) => row.profile_id === profile.id) ?? null;

  if (self && self.status !== "active") {
    const { data: reactivated } = await supabase
      .from("instructors")
      .update({ status: "active", full_name: profile.full_name || self.full_name })
      .eq("id", self.id)
      .select("id, full_name, profile_id, status")
      .single();
    if (reactivated) self = reactivated;
  }

  if (!self) {
    const { data: created } = await supabase
      .from("instructors")
      .insert({
        full_name: profile.full_name.trim() || "מנהל",
        phone: profile.phone,
        profile_id: profile.id,
        status: "active",
        hourly_rate: 0,
      })
      .select("id, full_name, profile_id, status")
      .single();
    self = created ?? null;
  }

  const others = rows
    .filter(
      (row) =>
        row.status === "active" && (!self || row.id !== self.id),
    )
    .map((row) => ({ id: row.id, full_name: row.full_name }));

  const options: ClassInstructorOption[] = [];
  if (self) {
    options.push({
      id: self.id,
      full_name: self.full_name,
      isSelf: true,
    });
  }
  options.push(...others);
  return options;
}
