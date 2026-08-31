import {
  calcAgeMonths,
  formatAgeRangeMonths,
  isAgeMonthsInRange,
} from "@/lib/age-range";
import { schoolGradeLabel, resolveSchoolGrade } from "@/lib/school-grade";
import type { Enums } from "@/types/database.types";

export type ClassGenderPolicy = Enums<"class_gender_policy">;
export type ClassAudienceType = Enums<"class_audience_type">;

export const CLASS_GENDER_POLICY: Record<ClassGenderPolicy, string> = {
  male: "בנים",
  female: "בנות",
  mixed: "מעורב",
};

export type ClassAudienceFields = {
  gender_policy: ClassGenderPolicy;
  audience_type: ClassAudienceType;
  /** גיל מינימום בחודשים. */
  age_min: number | null;
  /** גיל מקסימום בחודשים. */
  age_max: number | null;
  grade_min: number | null;
  grade_max: number | null;
};

export type ChildEligibilityInput = {
  full_name: string;
  gender: Enums<"gender_type"> | null;
  birth_date: string | null;
  school_grade: number | null;
  grade_school_year: number | null;
};

export function formatAgeRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  return formatAgeRangeMonths(min, max);
}

export function formatGradeRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min == null && max == null) return null;
  const from = schoolGradeLabel(min ?? max);
  const to = schoolGradeLabel(max ?? min);
  if (!from || !to) return null;
  if (min != null && max != null && min === max) {
    return min === 0 || min === 13 ? from : `כיתה ${from}`;
  }
  return `כיתות ${from}–${to}`;
}

/** תווית קהל יעד לתצוגה בכרטיסים ובעמודי חוג. */
export function formatClassAudience(cls: ClassAudienceFields): string {
  if (cls.audience_type === "open") return "פתוח לכולם";
  if (cls.audience_type === "grade") {
    return formatGradeRange(cls.grade_min, cls.grade_max) ?? "לפי כיתה";
  }
  return formatAgeRange(cls.age_min, cls.age_max) ?? "כל הגילאים";
}

export function formatAudienceFieldLabel(type: ClassAudienceType): string {
  if (type === "grade") return "כיתות";
  if (type === "open") return "קהל יעד";
  return "גילאים";
}

export function formatClassGenderPolicy(policy: ClassGenderPolicy): string {
  return CLASS_GENDER_POLICY[policy];
}

/** הודעה אם המגדר לא תואם חוג לבנים או לבנות בלבד. */
export function genderMismatchError(
  name: string,
  childGender: Enums<"gender_type"> | null | undefined,
  policy: ClassGenderPolicy
): string | null {
  if (policy === "mixed") return null;
  const label = name.trim() || "הילד/ה";
  const audience = policy === "male" ? "לבנים" : "לבנות";

  if (!childGender) {
    return `חסר מגדר עבור ${label}. עדכנו את הפרטים האישיים בהגדרות החשבון כדי להירשם לחוג ${audience} בלבד.`;
  }

  const feminine = childGender === "female";

  if (policy === "male" && childGender !== "male") {
    return feminine
      ? `${label} אינה מתאימה לחוג לבנים בלבד.`
      : `${label} אינו מתאים לחוג לבנים בלבד.`;
  }
  if (policy === "female" && childGender !== "female") {
    return childGender === "male"
      ? `${label} אינו מתאים לחוג לבנות בלבד.`
      : `${label} אינה מתאימה לחוג לבנות בלבד.`;
  }
  return null;
}

/** בדיקת מגדר להורה מול מדיניות החוג או המועדים שנבחרו. */
export function parentGenderError(
  name: string,
  gender: Enums<"gender_type"> | null | undefined,
  classPolicy: ClassGenderPolicy,
  slotGenders: ClassGenderPolicy[] = []
): string | null {
  const policies = slotGenders.length > 0 ? slotGenders : [classPolicy];
  for (const policy of policies) {
    const error = genderMismatchError(name, gender, policy);
    if (error) return error;
  }
  return null;
}

/** מחזיר הודעת שגיאה בעברית אם הילד/ה לא מתאים/ה לחוג, אחרת null. */
export function childEligibilityError(
  cls: ClassAudienceFields,
  child: ChildEligibilityInput,
): string | null {
  const name = child.full_name.trim() || "הילד/ה";
  const genderError = genderMismatchError(name, child.gender, cls.gender_policy);
  if (genderError) return genderError;

  if (cls.audience_type === "open") {
    return null;
  }

  if (cls.audience_type === "grade") {
    const grade = resolveSchoolGrade(
      child.school_grade,
      child.grade_school_year,
    );
    if (grade == null) {
      return `לא ניתן לרשום את ${name} — חסרת כיתה בחשבון.`;
    }
    const range = formatGradeRange(cls.grade_min, cls.grade_max);
    if (cls.grade_min != null && grade < cls.grade_min) {
      return range
        ? `${name} בכיתה נמוכה מדי. החוג מיועד ל${range}.`
        : `${name} בכיתה נמוכה מדי לחוג זה.`;
    }
    if (cls.grade_max != null && grade > cls.grade_max) {
      return range
        ? `${name} בכיתה גבוהה מדי. החוג מיועד ל${range}.`
        : `${name} בכיתה גבוהה מדי לחוג זה.`;
    }
    return null;
  }

  const hasAgeFilter = cls.age_min != null || cls.age_max != null;
  if (!hasAgeFilter) return null;

  const ageMonths = calcAgeMonths(child.birth_date);
  if (ageMonths == null) {
    return `לא ניתן לרשום את ${name} — חסר תאריך לידה בחשבון.`;
  }
  if (!isAgeMonthsInRange(ageMonths, cls.age_min, cls.age_max)) {
    if (cls.age_min != null && ageMonths < cls.age_min) {
      return `${name} צעיר/ה מדי לחוג זה.`;
    }
    return `${name} מבוגר/ת מדי לחוג זה.`;
  }
  return null;
}

/** מגדר להצגה: אם כל המועדים אותו מגדר — לפי המועד, אחרת לפי החוג. */
export function displayGenderPolicy(
  classGender: ClassGenderPolicy,
  slotGenders: Array<ClassGenderPolicy | null | undefined> = []
): ClassGenderPolicy {
  const unique = [
    ...new Set(
      slotGenders.filter((gender): gender is ClassGenderPolicy => Boolean(gender))
    ),
  ];
  if (unique.length === 1) return unique[0];
  return classGender;
}

export function pickOneSlotTraineeHint(gender: ClassGenderPolicy): string {
  if (gender === "female") {
    return "המתאמנת נרשמת למועד אחד וחוזרת אליו כל שבוע עד סוף התקופה.";
  }
  if (gender === "male") {
    return "המתאמן נרשם למועד אחד וחוזר אליו כל שבוע עד סוף התקופה.";
  }
  return "מתאמן או מתאמנת נרשמים למועד אחד וחוזרים אליו כל שבוע עד סוף התקופה.";
}

export function pickOneSlotTraineeShort(gender: ClassGenderPolicy): string {
  if (gender === "female") return "המתאמנת מגיעה לאחד מהם כל שבוע";
  if (gender === "male") return "המתאמן מגיע לאחד מהם כל שבוע";
  return "מתאמן או מתאמנת מגיעים לאחד מהם כל שבוע";
}

/** שם המתאמנים לפי מגדר החוג — יחיד או רבים. */
export function traineeNoun(
  gender: ClassGenderPolicy | null | undefined,
  count = 2
): string {
  const plural = count !== 1;
  if (gender === "female") return plural ? "מתאמנות" : "מתאמנת";
  if (gender === "male") return plural ? "מתאמנים" : "מתאמן";
  return plural ? "מתאמנים" : "מתאמן או מתאמנת";
}
