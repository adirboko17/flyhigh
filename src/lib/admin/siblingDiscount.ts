import {
  parseSiblingTiers,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

export const SIBLING_DISCOUNT_SETTING_KEY = "sibling_discount";

/** מדרגות הנחת האחים שחלות על כל חוג שלא הגדיר מדרגות משלו. */
export async function getDefaultSiblingTiers(): Promise<SiblingDiscountTier[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", SIBLING_DISCOUNT_SETTING_KEY)
    .maybeSingle();

  const value = data?.value as { tiers?: Json } | null;
  return parseSiblingTiers(value?.tiers ?? null);
}
