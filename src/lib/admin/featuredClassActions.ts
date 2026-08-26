"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  HOME_FEATURED_LIMIT,
  HOME_FEATURED_SETTING_KEY,
  parseFeaturedClassIds,
} from "@/lib/home/featuredClasses";
import { createClient } from "@/lib/supabase/server";

export async function saveHomeFeaturedClasses(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const featuredIds = parseFeaturedClassIds(ids);
  if (featuredIds.length !== ids.filter(Boolean).length) {
    return { success: false, error: "אפשר לבחור עד 3 חוגים שונים." };
  }
  if (featuredIds.length > HOME_FEATURED_LIMIT) {
    return { success: false, error: "אפשר לבחור עד 3 חוגים." };
  }

  const supabase = await createClient();

  if (featuredIds.length > 0) {
    const { data: rows, error: lookupError } = await supabase
      .from("classes")
      .select("id")
      .in("id", featuredIds);

    if (lookupError || (rows?.length ?? 0) !== featuredIds.length) {
      return { success: false, error: "חלק מהחוגים שנבחרו לא נמצאו." };
    }
  }

  const value = { ids: featuredIds };
  const { data: existing } = await supabase
    .from("system_settings")
    .select("id")
    .eq("key", HOME_FEATURED_SETTING_KEY)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("system_settings")
        .update({ value })
        .eq("id", existing.id)
    : await supabase
        .from("system_settings")
        .insert({ key: HOME_FEATURED_SETTING_KEY, value });

  if (error) {
    return { success: false, error: "שמירת החוגים המובילים נכשלה. נסו שוב." };
  }

  await revalidatePublicCatalog();
  revalidatePath("/admin/classes");

  return { success: true };
}
