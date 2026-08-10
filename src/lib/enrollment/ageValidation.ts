import { calcAge } from "@/utils/format";

export type AgeRange = {
  ageMin: number | null;
  ageMax: number | null;
};

export type AgeEligibility = {
  eligible: boolean;
  age: number | null;
  reason: string | null;
};

/** תווית טווח גילאים לתצוגה. */
export function formatAgeRange(ageMin: number | null, ageMax: number | null): string {
  if (ageMin !== null && ageMax !== null) return `גילאי ${ageMin}–${ageMax}`;
  if (ageMin !== null) return `מגיל ${ageMin}`;
  if (ageMax !== null) return `עד גיל ${ageMax}`;
  return "כל הגילאים";
}

/** האם לחוג מוגדר מגבלת גיל כלשהי. */
export function hasAgeRestriction(ageMin: number | null, ageMax: number | null): boolean {
  return ageMin !== null || ageMax !== null;
}

/** בדיקה האם גיל נמצא בטווח המותר. */
export function isAgeInRange(
  age: number,
  ageMin: number | null,
  ageMax: number | null
): boolean {
  if (ageMin !== null && age < ageMin) return false;
  if (ageMax !== null && age > ageMax) return false;
  return true;
}

/** בדיקת זכאות לפי תאריך לידה וטווח גילאי החוג. */
export function getAgeEligibility(
  birthDate: string | null | undefined,
  ageMin: number | null,
  ageMax: number | null,
  personName?: string
): AgeEligibility {
  if (!hasAgeRestriction(ageMin, ageMax)) {
    return { eligible: true, age: calcAge(birthDate), reason: null };
  }

  const age = calcAge(birthDate);
  const label = personName ?? "המשתתף/ת";

  if (age === null) {
    return {
      eligible: false,
      age: null,
      reason: `יש להזין תאריך לידה עבור ${label} לפני ההרשמה.`,
    };
  }

  if (!isAgeInRange(age, ageMin, ageMax)) {
    return {
      eligible: false,
      age,
      reason: `${label} (גיל ${age}) אינו/אינה בטווח הגילאים של החוג (${formatAgeRange(ageMin, ageMax)}).`,
    };
  }

  return { eligible: true, age, reason: null };
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
