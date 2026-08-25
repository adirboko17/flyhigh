import type { Json } from "@/types/database.types";

/**
 * הנחת אחים: בקופה חלה רק על חוגי שחייה ונינג'ה. כשמשפחה רושמת יותר מילד
 * אחד לאותה קטגוריה, ההנחה חלה רק על הילד השני ומעלה — הילד הראשון משלם
 * מחיר מלא. חוגים בקטגוריות אחרות (או חוגים בלי קטגוריה מתאימה) לא מקבלים
 * הנחת אחים. המדרגות נשמרות כמערך JSON על החוג, ואם לא הוגדרו — נלקחת
 * ברירת המחדל הגלובלית (הפונקציה class_sibling_discount_tiers במסד הנתונים).
 */

/** קטגוריות שעליהן חלה הנחת אחים בקופה. גרשיים בשם נינג'ה מתעלמים בהשוואה. */
const SIBLING_DISCOUNT_CATEGORY_KEYS = new Set(["שחייה", "נינגה"]);

function categoryKey(category: string | null | undefined): string {
  return (category ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['ʼ׳`ʹʻʾ]/g, "")
    .toLowerCase();
}

export function siblingDiscountAppliesToCategory(
  category: string | null | undefined
): boolean {
  return SIBLING_DISCOUNT_CATEGORY_KEYS.has(categoryKey(category));
}

/** מחזיר את מדרגות ההנחה לקופה — ריק לכל קטגוריה שאינה שחייה או נינג'ה. */
export function siblingTiersForCheckout(
  category: string | null | undefined,
  tiers: SiblingDiscountTier[]
): SiblingDiscountTier[] {
  return siblingDiscountAppliesToCategory(category) ? tiers : [];
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
