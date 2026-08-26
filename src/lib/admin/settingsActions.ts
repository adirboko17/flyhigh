"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { SIBLING_DISCOUNT_SETTING_KEY } from "@/lib/admin/siblingDiscount";
import {
  serializeSiblingTiers,
  type FamilyDiscountProductType,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import { createClient } from "@/lib/supabase/server";

export async function saveDefaultSiblingDiscount(input: {
  tiers: SiblingDiscountTier[];
  classCategories: string[];
  productTypes: FamilyDiscountProductType[];
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const value = {
    tiers: serializeSiblingTiers(input.tiers),
    class_categories: [...new Set(input.classCategories.map((name) => name.trim()).filter(Boolean))],
    product_types: input.productTypes,
  };

  const { data: existing } = await supabase
    .from("system_settings")
    .select("id")
    .eq("key", SIBLING_DISCOUNT_SETTING_KEY)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("system_settings")
        .update({ value })
        .eq("id", existing.id)
    : await supabase
        .from("system_settings")
        .insert({ key: SIBLING_DISCOUNT_SETTING_KEY, value });

  if (error) {
    return { success: false, error: "שמירת ההנחה נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/classes");
  revalidatePath("/", "layout");
  revalidatePath("/programs");
  revalidatePath("/classes", "layout");

  return { success: true };
}
