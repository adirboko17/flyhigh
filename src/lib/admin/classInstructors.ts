import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";
import type { Enums } from "@/types/database.types";

export type ClassInstructorOption = {
  id: string;
  full_name: string;
  gender: Enums<"gender_type"> | null;
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
    .select("id, full_name, gender, profile_id, status")
    .order("full_name");

  const rows = instructors ?? [];
  let self = rows.find((row) => row.profile_id === profile.id) ?? null;

  if (self && self.status !== "active") {
    const { data: reactivated } = await supabase
      .from("instructors")
      .update({ status: "active", full_name: profile.full_name || self.full_name })
      .eq("id", self.id)
      .select("id, full_name, gender, profile_id, status")
      .single();
    if (reactivated) self = reactivated;
  }

  if (!self) {
    const { data: created } = await supabase
      .from("instructors")
      .insert({
        full_name: profile.full_name.trim() || "מנהל",
        gender: profile.gender,
        phone: profile.phone,
        profile_id: profile.id,
        status: "active",
        hourly_rate: 0,
      })
      .select("id, full_name, gender, profile_id, status")
      .single();
    self = created ?? null;
  }

  const others = rows
    .filter(
      (row) =>
        row.status === "active" && (!self || row.id !== self.id),
    )
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      gender: row.gender,
    }));

  const options: ClassInstructorOption[] = [];
  if (self) {
    options.push({
      id: self.id,
      full_name: self.full_name,
      gender: self.gender,
      isSelf: true,
    });
  }
  options.push(...others);
  return options;
}
