import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

/**
 * הנחת בני משפחה: בקופה חלה על קטגוריות החוגים ועל סוגי המוצרים
 * שנבחרו בהגדרות. כשמשפחה רושמת יותר מילד אחד, ההנחה חלה רק על הילד
 * השני ומעלה. המדרגות נשמרות ב־system_settings, ואם לחוג אין מדרגות
 * משלו — נלקחת ברירת המחדל (class_sibling_discount_tiers).
 */

export const FAMILY_DISCOUNT_LABEL = "הנחת בני משפחה";
export const FAMILY_DISCOUNT_SETTING_KEY = "sibling_discount";

export const FAMILY_DISCOUNT_PRODUCT_TYPES = [
  { id: "program", label: "מנויים" },
  { id: "activity", label: "פעילויות" },
  { id: "pool_pass", label: "כרטיסים" },
  { id: "private_lesson", label: "שיעורים פרטיים" },
] as const;

export type FamilyDiscountProductType =
  (typeof FAMILY_DISCOUNT_PRODUCT_TYPES)[number]["id"];

export type FamilyDiscountSettings = {
  tiers: SiblingDiscountTier[];
  classCategories: string[];
  productTypes: FamilyDiscountProductType[];
};

/** קטגוריות ברירת מחדל לפני שהמנהל הגדיר היקף. גרשיים בנינג'ה מתעלמים בהשוואה. */
const DEFAULT_FAMILY_DISCOUNT_CATEGORIES = ["שחייה", "נינג'ה"];

function categoryKey(category: string | null | undefined): string {
  return (category ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['ʼ׳`ʹʻʾ]/g, "")
    .toLowerCase();
}

export function resolveSelectedCategories(
  stored: readonly string[],
  available: readonly string[]
): string[] {
  const keys = new Set(stored.map(categoryKey).filter(Boolean));
  return available.filter((name) => keys.has(categoryKey(name)));
}

export function siblingDiscountAppliesToCategory(
  category: string | null | undefined,
  allowedCategories: readonly string[]
): boolean {
  if (!categoryKey(category) || allowedCategories.length === 0) return false;
  const allowed = new Set(allowedCategories.map(categoryKey));
  return allowed.has(categoryKey(category));
}

export function familyDiscountAppliesToProduct(
  productType: FamilyDiscountProductType,
  allowedTypes: readonly FamilyDiscountProductType[]
): boolean {
  return allowedTypes.includes(productType);
}

/** מחזיר את מדרגות ההנחה לקופת חוג — ריק אם הקטגוריה לא נכללה בהגדרות. */
export function siblingTiersForCheckout(
  category: string | null | undefined,
  tiers: SiblingDiscountTier[],
  allowedCategories: readonly string[]
): SiblingDiscountTier[] {
  return siblingDiscountAppliesToCategory(category, allowedCategories)
    ? tiers
    : [];
}

export function parseFamilyDiscountProductTypes(
  value: unknown
): FamilyDiscountProductType[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(
    FAMILY_DISCOUNT_PRODUCT_TYPES.map((item) => item.id)
  );
  const unique: FamilyDiscountProductType[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item as FamilyDiscountProductType)) {
      continue;
    }
    const id = item as FamilyDiscountProductType;
    if (!unique.includes(id)) unique.push(id);
  }
  return unique;
}

export function parseFamilyDiscountSettings(
  value: unknown
): FamilyDiscountSettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const classCategories = Array.isArray(raw.class_categories)
    ? raw.class_categories
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [...DEFAULT_FAMILY_DISCOUNT_CATEGORIES];

  return {
    tiers: parseSiblingTiers((raw.tiers as Json) ?? null),
    classCategories,
    productTypes: parseFamilyDiscountProductTypes(raw.product_types),
  };
}

export async function loadFamilyDiscountSettings(
  supabase: SupabaseClient<Database>
): Promise<FamilyDiscountSettings> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", FAMILY_DISCOUNT_SETTING_KEY)
    .maybeSingle();

  return parseFamilyDiscountSettings(data?.value);
}

export function familyDiscountProductForPlan(
  kind: "program" | "pool_pass" | "private_lesson",
  programKind?: string | null
): FamilyDiscountProductType {
  if (kind === "program" && programKind === "activity") return "activity";
  return kind === "program" ? "program" : kind;
}

export type SiblingDiscountTier = {
  /** ההנחה נפתחת כשמספר הילדים הרשומים גדול או שווה למספר הזה. */
  minChildren: number;
  percent: number;
};

export type SiblingDiscountBreakdown = {
  /** מספר הילדים שנספרו לצורך המדרגה (כולל אחים שכבר רשומים לאותה קטגוריה). */
  childCount: number;
  percent: number;
  /** כמה ילדים בהזמנה הנוכחית משלמים מחיר מלא. */
  fullPriceChildren: number;
  /** כמה ילדים בהזמנה הנוכחית מקבלים את אחוז ההנחה. */
  discountedChildren: number;
  listTotal: number;
  discountAmount: number;
  total: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** קורא מדרגות מ־JSON של מסד הנתונים ומתעלם מרשומות לא תקינות. */
export function parseSiblingTiers(value: Json | null | undefined): SiblingDiscountTier[] {
  if (!Array.isArray(value)) return [];

  const tiers: SiblingDiscountTier[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;

    const record = entry as Record<string, Json | undefined>;
    const minChildren = Number(record.min_children);
    const percent = Number(record.percent);

    if (!Number.isFinite(minChildren) || !Number.isFinite(percent)) continue;
    if (minChildren < 2) continue;

    tiers.push({
      minChildren: Math.floor(minChildren),
      percent: clamp(round2(percent), 0, 100),
    });
  }

  // מהמדרגה הגבוהה לנמוכה, כדי שמשפחה עם 3 ילדים תקבל את מדרגת ה־3.
  return tiers.sort((a, b) => b.minChildren - a.minChildren);
}

export function serializeSiblingTiers(tiers: SiblingDiscountTier[]): Json {
  return [...tiers]
    .sort((a, b) => a.minChildren - b.minChildren)
    .map((tier) => ({
      min_children: Math.floor(tier.minChildren),
      percent: clamp(round2(tier.percent), 0, 100),
    }));
}

export function resolveSiblingDiscountPercent(
  tiers: SiblingDiscountTier[],
  childCount: number
): number {
  const match = [...tiers]
    .sort((a, b) => b.minChildren - a.minChildren)
    .find((tier) => childCount >= tier.minChildren);

  return match ? clamp(round2(match.percent), 0, 100) : 0;
}

/**
 * מחשב את סכום ההזמנה: ילד ראשון במשפחה (באותה קטגוריה) במחיר מלא,
 * וכל ילד נוסף מקבל את אחוז ההנחה של המדרגה המתאימה.
 */
export function calculateOrderTotal(
  unitPrice: number,
  chargedChildren: number,
  tiers: SiblingDiscountTier[],
  /** מספר הילדים שנספר למדרגה — כולל אחים שכבר רשומים לאותה קטגוריה. */
  siblingCount = chargedChildren
): SiblingDiscountBreakdown {
  const safeCharged = Math.max(0, chargedChildren);
  const safeSiblingCount = Math.max(safeCharged, siblingCount);
  const alreadyEnrolled = Math.max(0, safeSiblingCount - safeCharged);
  const percent = resolveSiblingDiscountPercent(tiers, safeSiblingCount);

  // מושב אחד במחיר מלא לכל המשפחה. אם כבר יש אח רשום — כל הילדים בהזמנה מקבלים הנחה.
  const fullPriceChildren =
    percent <= 0
      ? safeCharged
      : alreadyEnrolled > 0
        ? 0
        : Math.min(1, safeCharged);
  const discountedChildren = Math.max(0, safeCharged - fullPriceChildren);

  const listTotal = round2(unitPrice * safeCharged);
  const fullPriceAmount = round2(unitPrice * fullPriceChildren);
  const discountedAmount = round2(
    unitPrice * discountedChildren * (1 - percent / 100),
  );
  const total = round2(fullPriceAmount + discountedAmount);

  return {
    childCount: safeSiblingCount,
    percent,
    fullPriceChildren,
    discountedChildren,
    listTotal,
    discountAmount: round2(listTotal - total),
    total,
  };
}

/**
 * מפצל סכום בין הילדים כך שסכום החיובים שווה בדיוק לסכום ההזמנה,
 * גם כשההנחה יוצרת אגורות שאינן מתחלקות.
 */
export function splitAmount(total: number, parts: number): number[] {
  if (parts <= 0) return [];

  const agorot = Math.round(total * 100);
  const base = Math.floor(agorot / parts);
  const remainder = agorot - base * parts;

  return Array.from(
    { length: parts },
    (_, index) => (base + (index < remainder ? 1 : 0)) / 100
  );
}

/**
 * סכום לחיוב לכל ילד: הראשון במשפחה במחיר מלא, השאר עם הנחה.
 * אם הועבר finalTotal (למשל אחרי קופון) — מנרמלים פרופורציונלית אליו.
 */
export function splitSiblingAmounts(
  unitPrice: number,
  childCount: number,
  percent: number,
  alreadyEnrolled: number,
  finalTotal?: number,
): number[] {
  if (childCount <= 0) return [];

  const ideal = Array.from({ length: childCount }, (_, index) => {
    const paysFull = percent <= 0 || (alreadyEnrolled === 0 && index === 0);
    return paysFull
      ? round2(unitPrice)
      : round2(unitPrice * (1 - percent / 100));
  });

  const idealTotal = round2(ideal.reduce((sum, value) => sum + value, 0));
  const target = finalTotal == null ? idealTotal : round2(finalTotal);

  if (idealTotal === 0) return splitAmount(target, childCount);
  if (idealTotal === target) return ideal;

  const scaled = ideal.map((value) => round2((value / idealTotal) * target));
  const scaledTotal = round2(scaled.reduce((sum, value) => sum + value, 0));
  const fix = round2(target - scaledTotal);
  if (scaled.length > 0 && fix !== 0) {
    scaled[scaled.length - 1] = round2(scaled[scaled.length - 1] + fix);
  }
  return scaled;
}

export function describeTier(tier: SiblingDiscountTier): string {
  return `${tier.minChildren} ילדים ומעלה · ${tier.percent}% הנחה מהילד ה־${tier.minChildren} ומעלה`;
}
