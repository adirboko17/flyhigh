import { israelDateOf } from "@/lib/scheduling/monthGrid";

export const HEALTH_DECLARATION_MANAGER = "מורית שפירא";

export type HealthDeclarationDraft = {
  idNumber: string;
  accepted: boolean;
  signedAt: string;
};

export type HealthDeclarationRecord = {
  id: string;
  child_id: string;
  parent_id: string;
  child_name: string;
  id_number: string;
  school_year: number;
  accepted: boolean;
  signed_at: string;
};

/** שנת החוגים להצהרה: מיוני כבר נרשמים לשנה שמתחילה בספטמבר. */
export function declarationSchoolYear(now = new Date()): number {
  const today = israelDateOf(now.toISOString());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month >= 6 ? year : year - 1;
}

const HEBREW_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"] as const;
const HEBREW_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"] as const;
const HEBREW_HUNDREDS = ["", "ק", "ר", "ש", "ת"] as const;

/** תשפ״ז מתוך שנת התחלה גרגוריאנית (2026 → תשפ״ז). */
export function hebrewSchoolYearLabel(gregorianStartYear: number): string {
  const hebrewYear = gregorianStartYear + 3761;
  const remainder = hebrewYear % 1000;
  const hundreds = Math.floor(remainder / 100);
  const tens = Math.floor((remainder % 100) / 10);
  const ones = remainder % 10;

  let letters = "";
  if (hundreds >= 4) {
    letters += "ת".repeat(Math.floor(hundreds / 4));
    letters += HEBREW_HUNDREDS[hundreds % 4];
  } else {
    letters += HEBREW_HUNDREDS[hundreds];
  }
  letters += HEBREW_TENS[tens];
  letters += HEBREW_ONES[ones];

  if (letters.length < 2) return letters;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

export function normalizeIdNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidIdNumber(value: string): boolean {
  return /^\d{5,9}$/.test(normalizeIdNumber(value));
}

export function isSignedHealthDraft(
  draft: HealthDeclarationDraft | null | undefined,
): draft is HealthDeclarationDraft {
  return Boolean(draft?.accepted && isValidIdNumber(draft.idNumber));
}

export const MISSING_HEALTH_DECLARATION_ERROR =
  "יש למלא הצהרת בריאות לכל ילד/ה לפני הרשמה לחוג.";

export function missingHealthDeclarationChildren<
  T extends { id: string; full_name: string },
>(children: T[], declaredChildIds: Iterable<string>): T[] {
  const declared = new Set(declaredChildIds);
  return children.filter((child) => !declared.has(child.id));
}

export function healthDeclarationErrorFor(names: string[]): string {
  if (names.length === 0) return MISSING_HEALTH_DECLARATION_ERROR;
  if (names.length === 1) {
    return `יש למלא הצהרת בריאות עבור ${names[0]} לפני הרשמה לחוג.`;
  }
  return `יש למלא הצהרת בריאות עבור ${names.join(", ")} לפני הרשמה לחוג.`;
}
