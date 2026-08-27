import type { Enums } from "@/types/database.types";
import { instructorPayType } from "@/lib/instructors/labels";

/**
 * חישוב שכר מדריכות.
 * לפי שעה: שעות המפגשים בפועל × תעריף, בלי מפגשים שבוטלו.
 * שכר חודשי קבוע: הסכום החודשי, כל עוד המדריכה כבר הועסקה בחודש הזה.
 */

export type PayrollSession = {
  instructorId: string | null;
  status: Enums<"class_session_status">;
  /** HH:MM או HH:MM:SS */
  startTime: string;
  endTime: string;
};

export type PayrollInstructor = {
  id: string;
  full_name: string;
  hourly_rate: number | null;
  pay_type?: Enums<"instructor_pay_type"> | null;
  monthly_salary?: number | null;
  status?: Enums<"instructor_status"> | null;
  created_at?: string | null;
};

export type PayrollLine = {
  instructorId: string;
  name: string;
  payType: Enums<"instructor_pay_type">;
  hourlyRate: number;
  monthlySalary: number;
  sessions: number;
  hours: number;
  amount: number;
};

export function sessionMinutes(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

export function isPayableSession(session: PayrollSession): boolean {
  return session.status !== "cancelled" && session.instructorId !== null;
}

/** סך הדקות שכל מדריכה עבדה, לפי מזהה. */
export function payableMinutesByInstructor(
  sessions: PayrollSession[]
): Map<string, { minutes: number; sessions: number }> {
  const totals = new Map<string, { minutes: number; sessions: number }>();

  for (const session of sessions) {
    if (!isPayableSession(session) || !session.instructorId) continue;
    const minutes = sessionMinutes(session.startTime, session.endTime);
    const current = totals.get(session.instructorId);
    if (current) {
      current.minutes += minutes;
      current.sessions += 1;
    } else {
      totals.set(session.instructorId, { minutes, sessions: 1 });
    }
  }

  return totals;
}

export function buildPayroll(
  sessions: PayrollSession[],
  instructors: PayrollInstructor[],
  options?: { month?: string }
): PayrollLine[] {
  const totals = payableMinutesByInstructor(sessions);

  return instructors
    .map((instructor) => {
      const worked = totals.get(instructor.id) ?? { minutes: 0, sessions: 0 };
      const hours = worked.minutes / 60;
      const hourlyRate = Number(instructor.hourly_rate ?? 0);
      const monthlySalary = Number(instructor.monthly_salary ?? 0);
      const payType = instructorPayType(instructor.pay_type);
      const hiredMonth = instructor.created_at?.slice(0, 7);
      const beforeHire =
        Boolean(options?.month && hiredMonth && options.month < hiredMonth);
      const inactiveWithoutWork =
        instructor.status === "inactive" && worked.sessions === 0;
      const amount =
        payType === "monthly"
          ? beforeHire || inactiveWithoutWork
            ? 0
            : monthlySalary
          : Math.round(hours * hourlyRate * 100) / 100;

      return {
        instructorId: instructor.id,
        name: instructor.full_name,
        payType,
        hourlyRate,
        monthlySalary,
        sessions: worked.sessions,
        hours: Math.round(hours * 100) / 100,
        amount: Math.round(amount * 100) / 100,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "he"));
}

export function payrollTotal(lines: PayrollLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} שע׳`;
  return `${whole}:${String(minutes).padStart(2, "0")} שע׳`;
}
