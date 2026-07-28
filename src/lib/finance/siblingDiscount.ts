import type { Json } from "@/types/database.types";

/**
 * הנחת אחים: כשמשפחה רושמת יותר מילד אחד לאותו חוג, ההנחה חלה על כל ההזמנה.
 * המדרגות נשמרות כמערך JSON על החוג, ואם לא הוגדרו — נלקחת ברירת המחדל הגלובלית
 * (הפונקציה class_sibling_discount_tiers במסד הנתונים מבצעת את הבחירה).
 */

export type SiblingDiscountTier = {
  /** ההנחה חלה כשמספר הילדים הרשומים גדול או שווה למספר הזה. */
  minChildren: number;
  percent: number;
};

export type SiblingDiscountBreakdown = {
  /** מספר הילדים שנספרו לצורך המדרגה (כולל אחים שכבר רשומים לחוג). */
  childCount: number;
  percent: number;
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

export function calculateOrderTotal(
  unitPrice: number,
  chargedChildren: number,
  tiers: SiblingDiscountTier[],
  /** מספר הילדים שנספר למדרגה — כולל אחים שכבר רשומים לחוג. */
  siblingCount = chargedChildren
): SiblingDiscountBreakdown {
  const listTotal = round2(unitPrice * chargedChildren);
  const percent = resolveSiblingDiscountPercent(tiers, siblingCount);
  const total = round2(listTotal * (1 - percent / 100));

  return {
    childCount: siblingCount,
    percent,
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

export function describeTier(tier: SiblingDiscountTier): string {
  return `${tier.minChildren} ילדים ומעלה · ${tier.percent}% הנחה`;
}
