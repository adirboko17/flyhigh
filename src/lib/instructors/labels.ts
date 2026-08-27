import type { Enums } from "@/types/database.types";
import { formatCurrency } from "@/utils/format";

export type InstructorGender = Enums<"gender_type"> | null | undefined;
export type InstructorPayType = Enums<"instructor_pay_type">;

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

export function instructorPayType(
  value?: InstructorPayType | null
): InstructorPayType {
  return value === "monthly" ? "monthly" : "hourly";
}

export function instructorHasPayRate(instructor: {
  pay_type?: InstructorPayType | null;
  hourly_rate: number | null;
  monthly_salary?: number | null;
}): boolean {
  if (instructorPayType(instructor.pay_type) === "monthly") {
    return Number(instructor.monthly_salary ?? 0) > 0;
  }
  return Number(instructor.hourly_rate ?? 0) > 0;
}

export function formatInstructorPay(instructor: {
  pay_type?: InstructorPayType | null;
  hourly_rate: number | null;
  monthly_salary?: number | null;
}): string {
  if (instructorPayType(instructor.pay_type) === "monthly") {
    const salary = Number(instructor.monthly_salary ?? 0);
    return salary > 0 ? `${formatCurrency(salary)} לחודש` : "—";
  }
  const rate = Number(instructor.hourly_rate ?? 0);
  return rate > 0 ? `${formatCurrency(rate)} לשעה` : "—";
}
