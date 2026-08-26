import type { Enums } from "@/types/database.types";

export type ProgramKind = Enums<"program_kind">;

export const PROGRAM_KIND_LABEL: Record<ProgramKind, string> = {
  membership: "מנוי",
  activity: "פעילות",
};

export function peopleCountLabel(count: number) {
  return `${count} ${count === 1 ? "משתתף" : "משתתפים"}`;
}

export function isActivityProgram(
  kind: string | null | undefined
): kind is "activity" {
  return kind === "activity";
}

/**
 * פעילות מסוג טיפול/שיעור: שם, משך ומחיר קבוע.
 * בלי מחירון קבוצה ובלי בחירת מספר משתתפים כמו בהשכרת בריכה.
 */
export function isSessionActivity(input: {
  kind?: string | null;
  durationMinutes?: number | null;
  hasGroupPricing?: boolean;
}): boolean {
  if (!isActivityProgram(input.kind)) return false;
  if (input.hasGroupPricing) return false;
  const minutes = Number(input.durationMinutes);
  return Number.isFinite(minutes) && minutes >= 1;
}

export function activityDurationLabel(minutes: number) {
  return `${minutes} דק׳`;
}

/** כמות נפשות שמותר לבחור ברכישת פעילות, כולל מדרגת 16 ומעלה. */
export const ACTIVITY_MAX_PEOPLE = 30;

/** משך ברירת מחדל לתיאום מועד פעילות, בדקות. */
export const ACTIVITY_DEFAULT_DURATION_MINUTES = 60;
