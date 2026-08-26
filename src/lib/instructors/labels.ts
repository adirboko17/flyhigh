import type { Enums } from "@/types/database.types";

export type InstructorGender = Enums<"gender_type"> | null | undefined;

export function instructorTitle(gender?: InstructorGender) {
  if (gender === "male") return "מדריך";
  if (gender === "female") return "מדריכה";
  return "מדריך/ה";
}

export function instructorStatusLabel(
  status: "active" | "inactive",
  gender?: InstructorGender
) {
  if (status === "active") return gender === "male" ? "פעיל" : "פעילה";
  return gender === "male" ? "לא פעיל" : "לא פעילה";
}

export function unassignedInstructorLabel(gender?: InstructorGender) {
  if (gender === "male") return "לא שובץ";
  return "לא שובצה";
}
