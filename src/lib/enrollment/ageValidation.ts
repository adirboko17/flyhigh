import {
  calcAgeMonths,
  formatAgeRangeMonths,
  formatChildAge,
  isAgeMonthsInRange,
} from "@/lib/age-range";

export type AgeRange = {
  ageMin: number | null;
  ageMax: number | null;
};

export type AgeEligibility = {
  eligible: boolean;
  /** גיל בחודשים, לתצוגה דרך ageLabel. */
  age: number | null;
  ageLabel: string | null;
  reason: string | null;
};

/** תווית טווח גילאים לתצוגה. min/max בחודשים. */
export function formatAgeRange(
  ageMin: number | null,
  ageMax: number | null
): string {
  return formatAgeRangeMonths(ageMin, ageMax) ?? "כל הגילאים";
}

/** האם לחוג מוגדר מגבלת גיל כלשהי. */
export function hasAgeRestriction(
  ageMin: number | null,
  ageMax: number | null
): boolean {
  return ageMin !== null || ageMax !== null;
}

/** בדיקה האם גיל (בחודשים) נמצא בטווח המותר. */
export function isAgeInRange(
  ageMonths: number,
  ageMin: number | null,
  ageMax: number | null
): boolean {
  return isAgeMonthsInRange(ageMonths, ageMin, ageMax);
}

/** בדיקת זכאות לפי תאריך לידה וטווח גילאי החוג (בחודשים). */
export function getAgeEligibility(
  birthDate: string | null | undefined,
  ageMin: number | null,
  ageMax: number | null,
  personName?: string
): AgeEligibility {
  const ageMonths = calcAgeMonths(birthDate);
  const ageLabel = formatChildAge(ageMonths);

  if (!hasAgeRestriction(ageMin, ageMax)) {
    return { eligible: true, age: ageMonths, ageLabel, reason: null };
  }

  const label = personName ?? "המשתתף/ת";

  if (ageMonths === null) {
    return {
      eligible: false,
      age: null,
      ageLabel: null,
      reason: `יש להזין תאריך לידה עבור ${label} לפני ההרשמה.`,
    };
  }

  if (!isAgeInRange(ageMonths, ageMin, ageMax)) {
    return {
      eligible: false,
      age: ageMonths,
      ageLabel,
      reason: `${label} (גיל ${ageLabel}) אינו/אינה בטווח הגילאים של החוג (${formatAgeRange(ageMin, ageMax)}).`,
    };
  }

  return { eligible: true, age: ageMonths, ageLabel, reason: null };
}

type Participant = {
  name: string;
  birthDate: string | null;
};

/**
 * אימות גילאים לכל המשתתפים. מחזיר הודעת שגיאה ראשונה שנמצאה, או null אם הכול תקין.
 */
export function validateParticipantsAge(
  participants: Participant[],
  ageMin: number | null,
  ageMax: number | null
): string | null {
  if (!hasAgeRestriction(ageMin, ageMax)) return null;

  for (const participant of participants) {
    const { eligible, reason } = getAgeEligibility(
      participant.birthDate,
      ageMin,
      ageMax,
      participant.name
    );
    if (!eligible && reason) return reason;
  }

  return null;
}
