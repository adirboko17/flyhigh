import type { Json } from "@/types/database.types";
import { ACTIVITY_MAX_PEOPLE, peopleCountLabel } from "@/lib/programs";
import { formatCurrency } from "@/utils/format";

/**
 * מחירון פעילות: או מחיר למשתתף (כשאין מדרגות), או מחיר קבוצה לפי טווח נפשות.
 * המדרגות נשמרות כ־JSON על הפעילות. טווחים חייבים להיות בלי חפיפה.
 */

export type ActivityPriceTier = {
  minPeople: number;
  /** null = אין תקרה, למשל "16 ומעלה". */
  maxPeople: number | null;
  /** מחיר לקבוצה כולה בטווח הזה, לא למשתתף. */
  price: number;
  note: string | null;
};

export type ActivityPriceQuote = {
  amount: number;
  mode: "per_person" | "group";
  tier: ActivityPriceTier | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function asRecord(entry: Json): Record<string, Json | undefined> | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  return entry as Record<string, Json | undefined>;
}

function readOptionalNote(value: Json | undefined): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note ? note : null;
}

function sortTiers(tiers: ActivityPriceTier[]): ActivityPriceTier[] {
  return [...tiers].sort((a, b) => a.minPeople - b.minPeople);
}

/** קורא מדרגות מ־JSON של מסד הנתונים ומתעלם מרשומות לא תקינות. */
export function parseActivityPriceTiers(
  value: Json | null | undefined
): ActivityPriceTier[] {
  if (!Array.isArray(value)) return [];

  const tiers: ActivityPriceTier[] = [];

  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;

    const minPeople = Math.floor(Number(record.min_people));
    const rawMax = record.max_people;
    const maxPeople =
      rawMax === null || rawMax === undefined || rawMax === ""
        ? null
        : Math.floor(Number(rawMax));
    const price = round2(Number(record.price));

    if (!Number.isFinite(minPeople) || minPeople < 1) continue;
    if (maxPeople !== null && (!Number.isFinite(maxPeople) || maxPeople < minPeople)) {
      continue;
    }
    if (!Number.isFinite(price) || price < 0) continue;

    tiers.push({
      minPeople,
      maxPeople,
      price,
      note: readOptionalNote(record.note),
    });
  }

  return sortTiers(tiers);
}

export function serializeActivityPriceTiers(tiers: ActivityPriceTier[]): Json {
  return sortTiers(tiers).map((tier) => ({
    min_people: Math.floor(tier.minPeople),
    max_people: tier.maxPeople === null ? null : Math.floor(tier.maxPeople),
    price: clamp(round2(tier.price), 0, 1_000_000),
    note: tier.note?.trim() || null,
  }));
}

export function validateActivityPriceTiers(
  tiers: ActivityPriceTier[]
): string | null {
  if (tiers.length === 0) return null;
  if (tiers.length > 12) return "אפשר להגדיר עד 12 מדרגות.";

  const sorted = sortTiers(tiers);

  for (const tier of sorted) {
    if (!Number.isFinite(tier.minPeople) || tier.minPeople < 1) {
      return "כל מדרגה חייבת להתחיל ממשתתף אחד לפחות.";
    }
    if (
      tier.maxPeople !== null &&
      (!Number.isFinite(tier.maxPeople) || tier.maxPeople < tier.minPeople)
    ) {
      return "בכל מדרגה המקסימום חייב להיות גדול או שווה למינימום.";
    }
    if (!Number.isFinite(tier.price) || tier.price < 0) {
      return "כל מדרגה חייבת לכלול מחיר תקין לקבוצה.";
    }
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (current.maxPeople === null) {
      return "מדרגה בלי תקרה חייבת להיות האחרונה.";
    }
    if (next.minPeople <= current.maxPeople) {
      return "הטווחים לא יכולים לחפוף. אם מספר מופיע בשתי שורות, בחרו באיזו מדרגה הוא נמצא.";
    }
  }

  return null;
}

export function findActivityPriceTier(
  tiers: ActivityPriceTier[],
  peopleCount: number
): ActivityPriceTier | null {
  if (!Number.isFinite(peopleCount) || peopleCount < 1) return null;
  return (
    sortTiers(tiers).find((tier) => {
      if (peopleCount < tier.minPeople) return false;
      return tier.maxPeople === null || peopleCount <= tier.maxPeople;
    }) ?? null
  );
}

/**
 * מחיר לתשלום: מדרגת קבוצה אם הוגדרה, אחרת מחיר למשתתף × כמות.
 * מחזיר null כשהכמות לא נמצאת באף מדרגה.
 */
export function quoteActivityPrice(
  peopleCount: number,
  perPersonPrice: number,
  tiers: ActivityPriceTier[]
): ActivityPriceQuote | null {
  const count = Math.floor(Number(peopleCount));
  if (!Number.isFinite(count) || count < 1) return null;

  if (tiers.length === 0) {
    const unit = Number.isFinite(perPersonPrice) ? Math.max(perPersonPrice, 0) : 0;
    return {
      amount: round2(unit * count),
      mode: "per_person",
      tier: null,
    };
  }

  const tier = findActivityPriceTier(tiers, count);
  if (!tier) return null;

  return {
    amount: round2(tier.price),
    mode: "group",
    tier,
  };
}

export function activityStartingPrice(
  tiers: ActivityPriceTier[],
  fallback: number
): number {
  if (tiers.length === 0) return fallback;
  return Math.min(...tiers.map((tier) => tier.price));
}

export function usesGroupPricing(tiers: ActivityPriceTier[]): boolean {
  return tiers.length > 0;
}

export function activityPeopleCap(tiers: ActivityPriceTier[]): number {
  if (tiers.length === 0) return ACTIVITY_MAX_PEOPLE;
  const last = sortTiers(tiers)[tiers.length - 1];
  if (!last || last.maxPeople === null) return ACTIVITY_MAX_PEOPLE;
  return Math.max(last.maxPeople, last.minPeople);
}

export function activityDefaultPeopleCount(tiers: ActivityPriceTier[]): number {
  return tiers[0]?.minPeople ?? 1;
}

export function describeActivityPeopleRange(tier: ActivityPriceTier): string {
  if (tier.maxPeople === null) {
    return `${tier.minPeople} משתתפים ומעלה`;
  }
  if (tier.minPeople === tier.maxPeople) {
    return peopleCountLabel(tier.minPeople);
  }
  return `${tier.minPeople}–${tier.maxPeople} משתתפים`;
}

/** טווח קצר לכרטיס, בלי המילה «משתתפים». */
export function shortActivityPeopleRange(tier: ActivityPriceTier): string {
  if (tier.maxPeople === null) return `${tier.minPeople}+`;
  if (tier.minPeople === tier.maxPeople) return String(tier.minPeople);
  return `${tier.minPeople}–${tier.maxPeople}`;
}

export function describeActivityTier(tier: ActivityPriceTier): string {
  const range = describeActivityPeopleRange(tier);
  const price = formatCurrency(tier.price);
  return tier.note ? `${range} — ${price} (${tier.note})` : `${range} — ${price}`;
}

export function extraHalfHourLabel(price: number | null | undefined): string | null {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  return `כל חצי שעה נוספת — תוספת ${formatCurrency(value)}`;
}

/** מחירון הפוגה מהגיליון: מחיר לקבוצה לפי מספר נפשות. 10 נפשות במדרגת 500 ₪. */
export const HAFUGA_PRICE_TIERS: ActivityPriceTier[] = [
  { minPeople: 2, maxPeople: 2, price: 250, note: null },
  { minPeople: 4, maxPeople: 5, price: 300, note: null },
  { minPeople: 6, maxPeople: 7, price: 400, note: null },
  { minPeople: 8, maxPeople: 10, price: 500, note: null },
  { minPeople: 11, maxPeople: 15, price: 750, note: null },
  { minPeople: 16, maxPeople: null, price: 1000, note: "לשעתיים" },
];

export const HAFUGA_EXTRA_HALF_HOUR_PRICE = 100;
