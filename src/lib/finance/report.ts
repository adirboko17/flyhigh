import {
  adminPaymentBadge,
  isAbandonedCardcomCharge,
  isCollectibleOpenCharge,
  isPoolPassPaymentMethod,
  PAYMENT_METHOD,
} from "@/lib/constants";
import {
  buildPayroll,
  mergePayrollLines,
  payrollTotal,
  type PayrollInstructor,
  type PayrollLine,
  type PayrollSession,
} from "@/lib/finance/payroll";
import type { FinancePeriod } from "@/lib/finance/period";
import {
  MATNAS_INCOME_SOURCE,
  recurringAmountForMonth,
  type RecurringIncomeEntry,
} from "@/lib/finance/recurringIncome";
import {
  SUBJECT_KIND_LABEL,
  subjectClassCategory,
  subjectKind,
  subjectLabel,
  type EnrollmentSubject,
} from "@/lib/finance/subject";
import { resolveSessionInstructorId } from "@/lib/instructors/sessionInstructor";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  israelDateOf,
  listMonths,
  monthDayOverlap,
  monthsInRange,
  monthOf,
  monthRange,
  shiftMonth,
} from "@/lib/scheduling/monthGrid";
import type { Enums } from "@/types/database.types";

const TREND_MONTHS = 12;

export type FinanceBreakdownRow = {
  key: string;
  label: string;
  value: number;
  extra?: string;
};

export type FinanceTransaction = {
  id: string;
  parentName: string;
  subject: string;
  amount: number;
  method: Enums<"payment_method"> | null;
  methodLabel: string;
  status: Enums<"payment_status">;
  badgeLabel: string;
  badgeTone: ReturnType<typeof adminPaymentBadge>["tone"];
  date: string;
};

export type FinanceSnapshot = {
  period: FinancePeriod;
  paymentsRevenue: number;
  matnasAmount: number;
  revenue: number;
  payroll: number;
  netProfit: number;
  paidCount: number;
  newEnrollments: number;
  payrollLines: PayrollLine[];
  transactions: FinanceTransaction[];
  methodTotals: FinanceBreakdownRow[];
  kindTotals: FinanceBreakdownRow[];
  categoryTotals: FinanceBreakdownRow[];
  subjectTotals: FinanceBreakdownRow[];
  customerTotals: FinanceBreakdownRow[];
};

export type FinanceDashboard = {
  snapshot: FinanceSnapshot;
  compareSnapshot: FinanceSnapshot | null;
  openTotal: number;
  openChargesCount: number;
  occupancy: number;
  takenSeats: number;
  totalCapacity: number;
  collectedInWindow: number;
  trendMonths: string[];
  revenueByMonth: Map<string, number>;
  payrollByMonth: Map<string, number>;
  matnasByMonth: Map<string, number>;
  matnasEntries: RecurringIncomeEntry[];
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_method: Enums<"payment_method"> | null;
  status: Enums<"payment_status">;
  paid_at: string | null;
  created_at: string;
  parent_id: string;
  external_reference: string | null;
  office_collection: boolean | null;
  profiles: { full_name: string | null } | null;
  enrollments: EnrollmentSubject | null;
  payment_receipts: { amount: number }[] | null;
};

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function inRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function paymentActivityDate(payment: Pick<PaymentRow, "paid_at" | "created_at">) {
  return israelDateOf(payment.paid_at ?? payment.created_at);
}

function kindLabel(kind: string) {
  if (kind === "other") return "אחר";
  if (kind === "matnas") return "מתנ״ס";
  return SUBJECT_KIND_LABEL[kind as keyof typeof SUBJECT_KIND_LABEL] ?? kind;
}

function payrollForPeriod(
  sessionsByMonth: Map<string, PayrollSession[]>,
  instructors: PayrollInstructor[],
  start: string,
  end: string
): PayrollLine[] {
  const groups = monthsInRange(start, end).map((month) => {
    const { days, total } = monthDayOverlap(month, start, end);
    const fraction = total > 0 ? days / total : 1;
    const lines = buildPayroll(sessionsByMonth.get(month) ?? [], instructors, {
      month,
    });
    if (fraction >= 0.999) return lines;
    return lines.map((line) =>
      line.payType === "monthly"
        ? { ...line, amount: Math.round(line.amount * fraction * 100) / 100 }
        : line
    );
  });
  return mergePayrollLines(groups);
}

function matnasForPeriod(entries: RecurringIncomeEntry[], start: string, end: string) {
  return monthsInRange(start, end).reduce((sum, month) => {
    const amount = recurringAmountForMonth(entries, month);
    const { days, total } = monthDayOverlap(month, start, end);
    const fraction = total > 0 ? days / total : 1;
    return sum + amount * fraction;
  }, 0);
}

function toBreakdown(
  map: Map<string, number>,
  labelOf: (key: string) => string
): FinanceBreakdownRow[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, label: labelOf(key), value }));
}

function buildSnapshot(input: {
  period: FinancePeriod;
  payments: PaymentRow[];
  sessionsByMonth: Map<string, PayrollSession[]>;
  instructors: PayrollInstructor[];
  matnasEntries: RecurringIncomeEntry[];
  newEnrollments: number;
}): FinanceSnapshot {
  const { period } = input;
  const payrollLines = payrollForPeriod(
    input.sessionsByMonth,
    input.instructors,
    period.start,
    period.end
  );
  const payroll = payrollTotal(payrollLines);
  const workingPayrollLines = payrollLines.filter(
    (line) =>
      line.sessions > 0 || (line.payType === "monthly" && line.amount > 0)
  );

  const periodPayments = input.payments.filter((payment) =>
    inRange(paymentActivityDate(payment), period.start, period.end)
  );
  const paid = periodPayments.filter(
    (payment) =>
      payment.status === "paid" &&
      Boolean(payment.paid_at) &&
      !isPoolPassPaymentMethod(payment.payment_method) &&
      inRange(israelDateOf(payment.paid_at!), period.start, period.end)
  );

  const paymentsRevenue = paid.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const matnasAmount = Math.round(matnasForPeriod(input.matnasEntries, period.start, period.end) * 100) / 100;
  const revenue = paymentsRevenue + matnasAmount;

  const methodTotals = new Map<string, number>();
  const kindTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  const subjectTotals = new Map<string, number>();
  const customerTotals = new Map<string, { name: string; amount: number; charges: number }>();

  for (const payment of paid) {
    const amount = Number(payment.amount);
    addToMap(methodTotals, payment.payment_method ?? "external", amount);
    addToMap(subjectTotals, subjectLabel(payment.enrollments), amount);
    addToMap(kindTotals, subjectKind(payment.enrollments) ?? "other", amount);
    const category = subjectClassCategory(payment.enrollments);
    if (category) addToMap(categoryTotals, category, amount);

    const customer = customerTotals.get(payment.parent_id);
    if (customer) {
      customer.amount += amount;
      customer.charges += 1;
    } else {
      customerTotals.set(payment.parent_id, {
        name: payment.profiles?.full_name ?? "לקוח לא ידוע",
        amount,
        charges: 1,
      });
    }
  }

  const kindRows = toBreakdown(kindTotals, kindLabel);
  if (matnasAmount > 0) {
    kindRows.push({ key: "matnas", label: "מתנ״ס", value: matnasAmount });
    kindRows.sort((a, b) => b.value - a.value);
  }

  const transactions: FinanceTransaction[] = periodPayments
    .filter(
      (payment) =>
        !isPoolPassPaymentMethod(payment.payment_method) &&
        !isAbandonedCardcomCharge(
          payment.status,
          payment.payment_method,
          payment.external_reference,
          payment.office_collection
        )
    )
    .map((payment) => {
      const badge = adminPaymentBadge(payment.status, payment.payment_method, {
        cardcomReference: payment.external_reference,
      });
      return {
        id: payment.id,
        parentName: payment.profiles?.full_name ?? "-",
        subject: subjectLabel(payment.enrollments),
        amount: Number(payment.amount),
        method: payment.payment_method,
        methodLabel: payment.payment_method
          ? PAYMENT_METHOD[payment.payment_method]
          : "-",
        status: payment.status,
        badgeLabel: badge.label,
        badgeTone: badge.tone,
        date: payment.paid_at ?? payment.created_at,
      };
    });

  return {
    period,
    paymentsRevenue,
    matnasAmount,
    revenue,
    payroll,
    netProfit: revenue - payroll,
    paidCount: paid.length,
    newEnrollments: input.newEnrollments,
    payrollLines: workingPayrollLines,
    transactions,
    methodTotals: toBreakdown(
      methodTotals,
      (key) => PAYMENT_METHOD[key as keyof typeof PAYMENT_METHOD] ?? key
    ),
    kindTotals: kindRows,
    categoryTotals: toBreakdown(categoryTotals, (key) => key),
    subjectTotals: toBreakdown(subjectTotals, (key) => key),
    customerTotals: [...customerTotals.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([key, customer]) => ({
        key,
        label: customer.name,
        value: customer.amount,
        extra: `${customer.charges} חיובים`,
      })),
  };
}

async function countEnrollments(
  supabase: Awaited<ReturnType<typeof createAdminDataClient>>,
  start: string,
  end: string
) {
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${start}T00:00:00`)
    .lte("created_at", `${end}T23:59:59`);
  return count ?? 0;
}

export async function loadFinanceDashboard(input: {
  period: FinancePeriod;
  compare: FinancePeriod | null;
}): Promise<FinanceDashboard> {
  const { period, compare } = input;
  const supabase = await createAdminDataClient();

  const windowStart = compare && compare.start < period.start ? compare.start : period.start;
  const windowEnd = compare && compare.end > period.end ? compare.end : period.end;
  const trendEndMonth = monthOf(period.end);
  const trendMonths = listMonths(trendEndMonth, TREND_MONTHS);
  const trendStart = monthRange(trendMonths[0]).start;
  const yoyStart = monthRange(shiftMonth(trendMonths[0], -12)).start;
  const loadStart = [trendStart, windowStart, compare ? yoyStart : trendStart].sort()[0];
  const loadEnd = monthRange(monthOf(windowEnd)).end;

  const [
    { data: payments },
    { data: sessions },
    { data: instructors },
    { count: takenSeatsCount },
    { data: classes },
    { data: matnasRows },
    { data: weeklySlots },
    newEnrollments,
    compareEnrollments,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, payment_method, status, paid_at, created_at, parent_id, external_reference, office_collection, profiles(full_name), enrollments(type, classes(title, category), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(amount)"
      )
      .or(
        `created_at.gte.${loadStart},paid_at.gte.${loadStart},status.eq.pending,status.eq.partial`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("class_sessions")
      .select(
        "session_date, start_time, end_time, status, substitute_instructor_id, weekly_slot_id, classes(instructor_id)"
      )
      .gte("session_date", loadStart)
      .lte("session_date", loadEnd),
    supabase
      .from("instructors")
      .select("id, full_name, hourly_rate, monthly_salary, pay_type, status, created_at"),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("classes").select("capacity, status"),
    supabase
      .from("recurring_incomes")
      .select("month, amount")
      .eq("source", MATNAS_INCOME_SOURCE)
      .order("month"),
    supabase.from("class_weekly_slots").select("id, instructor_id"),
    countEnrollments(supabase, period.start, period.end),
    compare
      ? countEnrollments(supabase, compare.start, compare.end)
      : Promise.resolve(0),
  ]);

  const allPayments = (payments ?? []) as PaymentRow[];
  const allInstructors = (instructors ?? []) as PayrollInstructor[];
  const matnasEntries = (matnasRows ?? []).map((row) => ({
    month: row.month,
    amount: Number(row.amount),
  }));

  const slotInstructorById = new Map(
    (weeklySlots ?? []).map((slot) => [slot.id, slot.instructor_id])
  );

  const sessionsByMonth = new Map<string, PayrollSession[]>();
  for (const session of sessions ?? []) {
    const key = session.session_date.slice(0, 7);
    const entry: PayrollSession = {
      instructorId: resolveSessionInstructorId({
        substituteInstructorId: session.substitute_instructor_id,
        slotInstructorId: session.weekly_slot_id
          ? slotInstructorById.get(session.weekly_slot_id)
          : null,
        classInstructorId: session.classes?.instructor_id,
      }),
      status: session.status,
      startTime: session.start_time,
      endTime: session.end_time,
    };
    const list = sessionsByMonth.get(key);
    if (list) list.push(entry);
    else sessionsByMonth.set(key, [entry]);
  }

  const revenueByMonth = new Map<string, number>();
  for (const payment of allPayments) {
    if (payment.status !== "paid" || !payment.paid_at) continue;
    if (isPoolPassPaymentMethod(payment.payment_method)) continue;
    addToMap(revenueByMonth, israelDateOf(payment.paid_at).slice(0, 7), Number(payment.amount));
  }

  const payrollByMonth = new Map<string, number>();
  const matnasByMonth = new Map<string, number>();
  for (const month of monthsInRange(monthOf(loadStart), monthOf(loadEnd))) {
    payrollByMonth.set(
      month,
      payrollTotal(
        buildPayroll(sessionsByMonth.get(month) ?? [], allInstructors, { month })
      )
    );
    matnasByMonth.set(month, recurringAmountForMonth(matnasEntries, month));
  }

  const openCharges = allPayments.filter((payment) =>
    isCollectibleOpenCharge(
      payment.status,
      payment.payment_method,
      payment.external_reference,
      payment.office_collection
    )
  );
  const openTotal = openCharges.reduce((sum, payment) => {
    const paid = (payment.payment_receipts ?? []).reduce(
      (acc, receipt) => acc + Number(receipt.amount),
      0
    );
    return sum + Math.max(0, Number(payment.amount) - paid);
  }, 0);

  const activeClasses = (classes ?? []).filter((item) => item.status === "active");
  const totalCapacity = activeClasses.reduce((sum, item) => sum + (item.capacity ?? 0), 0);
  const takenSeats = takenSeatsCount ?? 0;
  const occupancy =
    totalCapacity > 0 ? Math.round((takenSeats / totalCapacity) * 100) : 0;

  const collectedInWindow = [...revenueByMonth.values()].reduce((a, b) => a + b, 0);

  const snapshot = buildSnapshot({
    period,
    payments: allPayments,
    sessionsByMonth,
    instructors: allInstructors,
    matnasEntries,
    newEnrollments,
  });

  const compareSnapshot = compare
    ? buildSnapshot({
        period: compare,
        payments: allPayments,
        sessionsByMonth,
        instructors: allInstructors,
        matnasEntries,
        newEnrollments: compareEnrollments,
      })
    : null;

  return {
    snapshot,
    compareSnapshot,
    openTotal,
    openChargesCount: openCharges.length,
    occupancy,
    takenSeats,
    totalCapacity,
    collectedInWindow,
    trendMonths,
    revenueByMonth,
    payrollByMonth,
    matnasByMonth,
    matnasEntries,
  };
}
