import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "@/types/database.types";
import { buildPayroll, type PayrollSession } from "./payroll";
import {
  listMonths,
  monthOf,
  monthRange,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";

/**
 * שליפת נתוני השכר של מדריכה מתוך class_sessions, בשימוש גם בדשבורד וגם
 * בעמוד השכר, כדי ששני המסכים יציגו בדיוק את אותם מספרים.
 */

export type InstructorPayrollInstructor = {
  id: string;
  full_name: string;
  hourly_rate: number | null;
  pay_type?: Enums<"instructor_pay_type"> | null;
  monthly_salary?: number | null;
  status?: Enums<"instructor_status"> | null;
  created_at?: string | null;
};

export type InstructorPayrollSession = {
  class_id: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: Enums<"class_session_status">;
  substitute_instructor_id: string | null;
  classes: { title: string } | null;
};

export type InstructorMonthSummary = {
  month: string;
  sessions: number;
  hours: number;
  amount: number;
};

export type InstructorPayroll = {
  currentMonth: string;
  months: string[];
  monthlySummary: InstructorMonthSummary[];
  thisMonth: InstructorMonthSummary;
  previousMonth: InstructorMonthSummary | null;
  /** המפגשים של החודש הנוכחי, ללא מפגשים שבוטלו. */
  sessionsThisMonth: InstructorPayrollSession[];
  rate: number;
  payType: Enums<"instructor_pay_type">;
};

const SESSION_COLUMNS =
  "class_id, session_date, start_time, end_time, status, substitute_instructor_id, classes(title)";

function emptyMonth(month: string): InstructorMonthSummary {
  return { month, sessions: 0, hours: 0, amount: 0 };
}

export async function loadInstructorPayroll(
  supabase: SupabaseClient<Database>,
  instructor: InstructorPayrollInstructor | null,
  monthCount: number
): Promise<InstructorPayroll> {
  const currentMonth = monthOf(todayInIsrael());
  const months = listMonths(currentMonth, monthCount);
  const rangeStart = monthRange(months[0]).start;
  const rangeEnd = monthRange(currentMonth).end;

  const { data: classes } = instructor
    ? await supabase
        .from("classes")
        .select("id")
        .eq("instructor_id", instructor.id)
    : { data: [] };

  const classIds = (classes ?? []).map((c) => c.id);

  // מפגשים של החוגים שלה, ובנוסף מפגשים בחוגים אחרים שבהם היא משמשת כמחליפה.
  const ownershipFilter = [
    classIds.length > 0 ? `class_id.in.(${classIds.join(",")})` : null,
    instructor ? `substitute_instructor_id.eq.${instructor.id}` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { data: sessions } = ownershipFilter
    ? await supabase
        .from("class_sessions")
        .select(SESSION_COLUMNS)
        .or(ownershipFilter)
        .gte("session_date", rangeStart)
        .lte("session_date", rangeEnd)
    : { data: [] };

  // מפגש שהועבר למחליפה יורד מהשכר של המדריכה הקבועה ונזקף למחליפה.
  const mySessions = ((sessions ?? []) as InstructorPayrollSession[]).filter(
    (session) =>
      session.substitute_instructor_id
        ? session.substitute_instructor_id === instructor?.id
        : true
  );

  const payrollInstructor = instructor ? [instructor] : [];

  const toPayrollSession = (
    session: InstructorPayrollSession
  ): PayrollSession => ({
    instructorId: instructor?.id ?? null,
    status: session.status,
    startTime: session.start_time,
    endTime: session.end_time,
  });

  const monthlySummary = months.map((month) => {
    const monthSessions = mySessions
      .filter((session) => session.session_date.startsWith(month))
      .map(toPayrollSession);
    const [line] = buildPayroll(monthSessions, payrollInstructor, { month });

    return {
      month,
      sessions: line?.sessions ?? 0,
      hours: line?.hours ?? 0,
      amount: line?.amount ?? 0,
    };
  });

  const thisMonth =
    monthlySummary.find((entry) => entry.month === currentMonth) ??
    emptyMonth(currentMonth);

  const previousMonth =
    monthlySummary.length > 1
      ? monthlySummary[monthlySummary.length - 2] ?? null
      : null;

  const sessionsThisMonth = mySessions.filter(
    (session) =>
      session.session_date.startsWith(currentMonth) &&
      session.status !== "cancelled"
  );

  return {
    currentMonth,
    months,
    monthlySummary,
    thisMonth,
    previousMonth,
    sessionsThisMonth,
    rate:
      instructor?.pay_type === "monthly"
        ? Number(instructor.monthly_salary ?? 0)
        : Number(instructor?.hourly_rate ?? 0),
    payType: instructor?.pay_type === "monthly" ? "monthly" : "hourly",
  };
}
