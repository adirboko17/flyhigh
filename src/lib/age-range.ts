/**
 * טווח גילאי חוג נשמר במסד בחודשים (age_min / age_max).
 * בטופס אפשר להזין שנים או חודשים לכל קצה.
 */

export type AgeUnit = "years" | "months";

export function ageBoundToMonths(value: number, unit: AgeUnit): number {
  return unit === "years" ? value * 12 : value;
}

export function parseAgeBoundInput(
  raw: string,
  unit: AgeUnit
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return ageBoundToMonths(n, unit);
}

/** ממיר חודשים שמורים בחזרה לשדה טופס (שנים שלמות → יחידת שנים). */
export function monthsToFormBound(months: number | null | undefined): {
  value: string;
  unit: AgeUnit;
} {
  if (months == null) return { value: "", unit: "years" };
  if (months === 0) return { value: "0", unit: "months" };
  if (months % 12 === 0) {
    return { value: String(months / 12), unit: "years" };
  }
  return { value: String(months), unit: "months" };
}

function parseDateOnly(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** גיל בחודשים שלמים מתאריך לידה. */
export function calcAgeMonths(
  birthDate: string | null | undefined,
  on = new Date()
): number | null {
  if (!birthDate) return null;
  const birth = parseDateOnly(birthDate);
  if (!birth) return null;
  let months =
    (on.getFullYear() - birth.getFullYear()) * 12 +
    (on.getMonth() - birth.getMonth());
  if (on.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function formatChildAge(months: number | null | undefined): string | null {
  if (months == null) return null;
  if (months < 24) {
    if (months <= 0) return "פחות מחודש";
    if (months === 1) return "חודש";
    if (months === 2) return "חודשיים";
    return `${months} חודשים`;
  }
  return String(Math.floor(months / 12));
}

function isWholeYears(months: number): boolean {
  return months > 0 && months % 12 === 0;
}

function formatFromBound(months: number): string {
  if (months === 0) return "מלידה";
  if (isWholeYears(months)) return `מגיל ${months / 12}`;
  if (months === 1) return "מחודש";
  if (months === 2) return "מחודשיים";
  return `מגיל ${months} חודשים`;
}

function formatToBound(months: number): string {
  if (isWholeYears(months)) {
    const years = months / 12;
    return years === 1 ? "שנה" : `גיל ${years}`;
  }
  if (months === 1) return "חודש";
  if (months === 2) return "חודשיים";
  return `${months} חודשים`;
}

/** תווית טווח גילאים. min/max הם חודשים. */
export function formatAgeRangeMonths(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    if (isWholeYears(min) && isWholeYears(max)) {
      return `גילאי ${min / 12}–${max / 12}`;
    }
    return `${formatFromBound(min)} עד ${formatToBound(max)}`;
  }
  if (min != null) return formatFromBound(min);
  if (max != null) {
    if (isWholeYears(max)) return `עד גיל ${max / 12}`;
    if (max === 2) return "עד חודשיים";
    return `עד ${max} חודשים`;
  }
  return null;
}

/**
 * עד גיל N שנים כולל את כל שנת הגיל (כמו קודם: ילד בן 3 ו־11 חודשים
 * נשאר בטווח «עד גיל 3»). גבול בחודשים שאינו שנה שלמה הוא מדויק.
 */
export function isAgeMonthsInRange(
  ageMonths: number,
  minMonths: number | null,
  maxMonths: number | null
): boolean {
  if (minMonths != null && ageMonths < minMonths) return false;
  if (maxMonths != null) {
    const exclusive =
      maxMonths > 0 && maxMonths % 12 === 0 ? maxMonths + 12 : maxMonths + 1;
    if (ageMonths >= exclusive) return false;
  }
  return true;
}
