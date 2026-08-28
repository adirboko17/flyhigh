"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  CATALOG_ORDER_SETTING_KEY,
  parseCatalogClassIds,
} from "@/lib/classes/catalogOrder";
import { createClient } from "@/lib/supabase/server";

export async function saveCatalogClassOrder(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const orderedIds = parseCatalogClassIds(ids);
  if (orderedIds.length !== ids.filter(Boolean).length) {
    return { success: false, error: "הרשימה מכילה מזהים לא תקינים." };
  }

  const supabase = await createClient();

  if (orderedIds.length > 0) {
    const { data: rows, error: lookupError } = await supabase
      .from("classes")
      .select("id")
      .in("id", orderedIds);

    if (lookupError || (rows?.length ?? 0) !== orderedIds.length) {
      return { success: false, error: "חלק מהחוגים ברשימה לא נמצאו." };
    }
  }

  const value = { ids: orderedIds };
  const { data: existing } = await supabase
    .from("system_settings")
    .select("id")
    .eq("key", CATALOG_ORDER_SETTING_KEY)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("system_settings")
        .update({ value })
        .eq("id", existing.id)
    : await supabase
        .from("system_settings")
        .insert({ key: CATALOG_ORDER_SETTING_KEY, value });

  if (error) {
    return { success: false, error: "שמירת הסדר נכשלה. נסו שוב." };
  }

  await revalidatePublicCatalog();
  revalidatePath("/admin/classes");

  return { success: true };
}
