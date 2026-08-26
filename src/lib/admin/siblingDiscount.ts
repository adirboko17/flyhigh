import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  FAMILY_DISCOUNT_SETTING_KEY,
  loadFamilyDiscountSettings,
  type FamilyDiscountSettings,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";

export const SIBLING_DISCOUNT_SETTING_KEY = FAMILY_DISCOUNT_SETTING_KEY;

export async function getFamilyDiscountSettings(): Promise<FamilyDiscountSettings> {
  const supabase = await createAdminDataClient();
  return loadFamilyDiscountSettings(supabase);
}

/** מדרגות הנחת בני המשפחה שחלות כברירת מחדל. */
export async function getDefaultSiblingTiers(): Promise<SiblingDiscountTier[]> {
  const settings = await getFamilyDiscountSettings();
  return settings.tiers;
}
