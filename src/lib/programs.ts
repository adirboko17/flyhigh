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

/** כמות נפשות שמותר לבחור ברכישת פעילות. */
export const ACTIVITY_MAX_PEOPLE = 20;

/** משך ברירת מחדל לתיאום מועד פעילות, בדקות. */
export const ACTIVITY_DEFAULT_DURATION_MINUTES = 60;
