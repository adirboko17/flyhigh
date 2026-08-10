import { israelDateOf } from "@/lib/scheduling/monthGrid";

/** 0=גן, 1–12=כיתות, 13=בוגר/ת (לא עולה יותר). */
export const SCHOOL_GRADE_MAX = 13;

export const SCHOOL_GRADES = [
  { value: 0, label: "גן" },
  { value: 1, label: "א׳" },
  { value: 2, label: "ב׳" },
  { value: 3, label: "ג׳" },
  { value: 4, label: "ד׳" },
  { value: 5, label: "ה׳" },
  { value: 6, label: "ו׳" },
  { value: 7, label: "ז׳" },
  { value: 8, label: "ח׳" },
  { value: 9, label: "ט׳" },
  { value: 10, label: "י׳" },
  { value: 11, label: "י״א" },
  { value: 12, label: "י״ב" },
  { value: 13, label: "בוגר/ת" },
] as const;

export type SchoolGradeValue = (typeof SCHOOL_GRADES)[number]["value"];

/** שנת תחילת שנת הלימודים (1 בספטמבר) לפי שעון ישראל. */
export function currentSchoolYear(now = new Date()): number {
  const today = israelDateOf(now.toISOString());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return month >= 9 ? year : year - 1;
}

/**
 * כיתה נוכחית: עולה אוטומטית בכל 1/9 לפי הפרש שנות הלימודים
 * מאז שנרשמה הכיתה, עד בוגר/ת.
 */
export function resolveSchoolGrade(
  grade: number | null | undefined,
  asOfSchoolYear: number | null | undefined,
  now = new Date(),
): number | null {
  if (grade == null || asOfSchoolYear == null) return null;
  if (grade >= SCHOOL_GRADE_MAX) return SCHOOL_GRADE_MAX;
  const yearsPassed = Math.max(0, currentSchoolYear(now) - asOfSchoolYear);
  return Math.min(SCHOOL_GRADE_MAX, grade + yearsPassed);
}

export function schoolGradeLabel(
  grade: number | null | undefined,
): string | null {
  if (grade == null) return null;
  return SCHOOL_GRADES.find((option) => option.value === grade)?.label ?? null;
}

export function formatSchoolGrade(
  grade: number | null | undefined,
  asOfSchoolYear: number | null | undefined,
): string | null {
  const current = resolveSchoolGrade(grade, asOfSchoolYear);
  if (current == null) return null;
  const label = schoolGradeLabel(current);
  return label ? `כיתה ${label}` : null;
}

export function parseSchoolGradeInput(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > SCHOOL_GRADE_MAX) {
    return null;
  }
  return parsed;
}
