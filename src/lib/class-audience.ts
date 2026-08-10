import { schoolGradeLabel, resolveSchoolGrade } from "@/lib/school-grade";
import { calcAge } from "@/utils/format";
import type { Enums } from "@/types/database.types";

export type ClassGenderPolicy = Enums<"class_gender_policy">;
export type ClassAudienceType = Enums<"class_audience_type">;

export const CLASS_GENDER_POLICY: Record<ClassGenderPolicy, string> = {
  male: "זכר",
  female: "נקבה",
  mixed: "מעורב",
};

export type ClassAudienceFields = {
  gender_policy: ClassGenderPolicy;
  audience_type: ClassAudienceType;
  age_min: number | null;
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
  if (min != null && max != null) return `גילאי ${min}–${max}`;
  if (min != null) return `מגיל ${min}`;
  if (max != null) return `עד גיל ${max}`;
  return null;
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
  if (cls.audience_type === "grade") {
    return formatGradeRange(cls.grade_min, cls.grade_max) ?? "לפי כיתה";
  }
  return formatAgeRange(cls.age_min, cls.age_max) ?? "כל הגילאים";
}

export function formatClassGenderPolicy(policy: ClassGenderPolicy): string {
  return CLASS_GENDER_POLICY[policy];
}

/** מחזיר הודעת שגיאה בעברית אם הילד/ה לא מתאים/ה לחוג, אחרת null. */
export function childEligibilityError(
  cls: ClassAudienceFields,
  child: ChildEligibilityInput,
): string | null {
  const name = child.full_name.trim() || "הילד/ה";

  if (cls.gender_policy === "male" && child.gender !== "male") {
    return `${name} אינו מתאים לחוג לבנים בלבד.`;
  }
  if (cls.gender_policy === "female" && child.gender !== "female") {
    return `${name} אינה מתאימה לחוג לבנות בלבד.`;
  }

  if (cls.audience_type === "grade") {
    const grade = resolveSchoolGrade(
      child.school_grade,
      child.grade_school_year,
    );
    if (grade == null) {
      return `לא ניתן לרשום את ${name} — חסרת כיתה בחשבון.`;
    }
    if (cls.grade_min != null && grade < cls.grade_min) {
      return `${name} בכיתה נמוכה מדי לחוג זה.`;
    }
    if (cls.grade_max != null && grade > cls.grade_max) {
      return `${name} בכיתה גבוהה מדי לחוג זה.`;
    }
    return null;
  }

  const hasAgeFilter = cls.age_min != null || cls.age_max != null;
  if (!hasAgeFilter) return null;

  const age = calcAge(child.birth_date);
  if (age == null) {
    return `לא ניתן לרשום את ${name} — חסר תאריך לידה בחשבון.`;
  }
  if (cls.age_min != null && age < cls.age_min) {
    return `${name} צעיר/ה מדי לחוג זה.`;
  }
  if (cls.age_max != null && age > cls.age_max) {
    return `${name} מבוגר/ת מדי לחוג זה.`;
  }
  return null;
}
