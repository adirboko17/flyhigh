import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  ColumnChart,
  DonutChart,
  RankBars,
  SplitBar,
  type DonutSlice,
  type RankItem,
} from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import {
  adminPaymentBadge,
  isAbandonedCardcomCharge,
  isCollectibleOpenCharge,
  PAYMENT_METHOD,
} from "@/lib/constants";
import { reconcilePendingCardcomCheckouts } from "@/lib/payments/cardcomCheckout";
import {
  buildPayroll,
  formatHours,
  payrollTotal,
  type PayrollSession,
} from "@/lib/finance/payroll";
import {
  SUBJECT_KIND_LABEL,
  subjectClassCategory,
  subjectKind,
  subjectLabel,
} from "@/lib/finance/subject";
import {
  israelDateOf,
  listMonths,
  monthLabel,
  monthOf,
  monthRange,
  parseMonthParam,
  shiftMonth,
  shortMonthLabel,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { MatnasIncomeCard } from "@/components/admin/MatnasIncomeCard";
import {
  MATNAS_INCOME_SOURCE,
  hasOwnRecurringEntry,
  recurringAmountByMonth,
  recurringAmountForMonth,
} from "@/lib/finance/recurringIncome";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "כספים" };

const TREND_MONTHS = 12;

/** צבעים קבועים לפילוח אמצעי התשלום. */
const METHOD_COLORS: Record<string, string> = {
  credit_card: "text-brand-500",
  bit: "text-violet-500",
  paybox: "text-fuchsia-500",
  standing_order: "text-indigo-500",
  cash: "text-emerald-500",
  bank_transfer: "text-sky-500",
  maccabi: "text-amber-500",
  amit: "text-rose-500",
  external: "text-ink-400",
};

/** צבעים לפילוח לפי סוג מוצר. */
const KIND_COLORS: Record<string, string> = {
  class: "text-brand-500",
  program: "text-aqua-500",
  pool_pass: "text-violet-500",
  private_lesson: "text-rose-500",
  other: "text-ink-400",
};

const CATEGORY_BAR_COLORS = [
  "bg-brand-500",
  "bg-aqua-500",
  "bg-violet-400",
  "bg-amber-500",
  "bg-rose-400",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-indigo-400",
];

function addToMap(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = todayInIsrael();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(monthParam, currentMonth);

  const trendMonths = listMonths(month, TREND_MONTHS);
  const trendStart = monthRange(trendMonths[0]).start;
  const { start: monthStart, end: monthEnd } = monthRange(month);

  const supabase = await createAdminDataClient();
  await reconcilePendingCardcomCheckouts();

  const [
    { data: payments },
    { data: sessions },
    { data: instructors },
    { count: newEnrollmentsCount },
    { count: takenSeatsCount },
    { data: classes },
    { data: matnasRows },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, payment_method, status, paid_at, created_at, parent_id, external_reference, profiles(full_name), enrollments(type, classes(title, category), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(amount)"
      )
      // חלון המגמה, ובנוסף כל חוב פתוח/חלקי בלי תלות בתאריך.
      .or(
        `created_at.gte.${trendStart},paid_at.gte.${trendStart},status.eq.pending,status.eq.partial`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("class_sessions")
      .select(
        "session_date, start_time, end_time, status, substitute_instructor_id, classes(instructor_id)"
      )
      .gte("session_date", trendStart)
      .lte("session_date", monthEnd),
    supabase
      .from("instructors")
      .select("id, full_name, hourly_rate, monthly_salary, pay_type, status, created_at"),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${monthStart}T00:00:00`)
      .lte("created_at", `${monthEnd}T23:59:59`),
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
  ]);

  const allPayments = payments ?? [];
  const allInstructors = instructors ?? [];

  /** חיוב משויך לחודש שבו נגבה, ואם טרם נגבה — לחודש שבו נוצר. */
  const paymentMonth = (payment: { paid_at: string | null; created_at: string }) =>
    israelDateOf(payment.paid_at ?? payment.created_at).slice(0, 7);

  const revenueByMonth = new Map<string, number>();
  for (const payment of allPayments) {
    if (payment.status !== "paid" || !payment.paid_at) continue;
    addToMap(
      revenueByMonth,
      israelDateOf(payment.paid_at).slice(0, 7),
      Number(payment.amount)
    );
  }

  const sessionsByMonth = new Map<string, PayrollSession[]>();
  for (const session of sessions ?? []) {
    const key = session.session_date.slice(0, 7);
    const entry: PayrollSession = {
      // מפגש שהועבר על ידי מחליפה משולם למחליפה ולא למדריכה הקבועה.
      instructorId:
        session.substitute_instructor_id ?? session.classes?.instructor_id ?? null,
      status: session.status,
      startTime: session.start_time,
      endTime: session.end_time,
    };
    const list = sessionsByMonth.get(key);
    if (list) list.push(entry);
    else sessionsByMonth.set(key, [entry]);
  }

  const payrollLines = buildPayroll(
    sessionsByMonth.get(month) ?? [],
    allInstructors,
    { month }
  );
  const monthPayroll = payrollTotal(payrollLines);
  const workingPayrollLines = payrollLines.filter(
    (line) =>
      line.sessions > 0 || (line.payType === "monthly" && line.amount > 0)
  );

  const matnasEntries = (matnasRows ?? []).map((row) => ({
    month: row.month,
    amount: Number(row.amount),
  }));
  const matnasByMonth = recurringAmountByMonth(matnasEntries, trendMonths);
  const matnasAmount = recurringAmountForMonth(matnasEntries, month);

  const paymentsRevenue = revenueByMonth.get(month) ?? 0;
  const monthRevenue = paymentsRevenue + matnasAmount;
  const netProfit = monthRevenue - monthPayroll;

  const openCharges = allPayments.filter((p) =>
    isCollectibleOpenCharge(
      p.status,
      p.payment_method,
      p.external_reference
    )
  );
  const openTotal = openCharges.reduce((sum, p) => {
    const paid = (p.payment_receipts ?? []).reduce(
      (acc, receipt) => acc + Number(receipt.amount),
      0
    );
    return sum + Math.max(0, Number(p.amount) - paid);
  }, 0);

  const monthPayments = allPayments.filter((p) => paymentMonth(p) === month);
  const monthPaid = monthPayments.filter((p) => p.status === "paid");
  // אשראי שלא נסלק הוא עגלה נטושה — לא מופיע ביומן העסקאות.
  const monthTransactions = monthPayments.filter(
    (p) =>
      !isAbandonedCardcomCharge(
        p.status,
        p.payment_method,
        p.external_reference
      )
  );

  const methodTotals = new Map<string, number>();
  const kindTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  const subjectTotals = new Map<string, number>();
  const customerTotals = new Map<
    string,
    { name: string; amount: number; charges: number }
  >();

  for (const payment of monthPaid) {
    const amount = Number(payment.amount);
    addToMap(methodTotals, payment.payment_method ?? "external", amount);
    addToMap(subjectTotals, subjectLabel(payment.enrollments), amount);

    const kind = subjectKind(payment.enrollments);
    addToMap(kindTotals, kind ?? "other", amount);

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

  const methodSlices: DonutSlice[] = [...methodTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([method, value]) => ({
      key: method,
      label: PAYMENT_METHOD[method as keyof typeof PAYMENT_METHOD] ?? method,
      value,
      className: METHOD_COLORS[method] ?? "text-ink-400",
    }));

  const kindSlices: DonutSlice[] = [...kindTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, value]) => ({
      key: kind,
      label:
        kind === "other"
          ? "אחר"
          : (SUBJECT_KIND_LABEL[kind as keyof typeof SUBJECT_KIND_LABEL] ??
            kind),
      value,
      className: KIND_COLORS[kind] ?? "text-ink-400",
    }));

  if (matnasAmount > 0) {
    kindSlices.push({
      key: "matnas",
      label: "מתנ״ס",
      value: matnasAmount,
      className: "text-teal-500",
    });
    kindSlices.sort((a, b) => b.value - a.value);
  }

  const topCustomers: RankItem[] = [...customerTotals.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((customer, index) => ({
      key: `${customer.name}-${index}`,
      label: customer.name,
      sublabel: `${customer.charges} חיובים`,
      value: customer.amount,
      barClassName: "bg-aqua-500",
    }));

  const revenueByCategory: RankItem[] = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      key: label,
      label,
      value,
      barClassName: CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length],
    }));

  const revenueBySubject: RankItem[] = [...subjectTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({
      key: label,
      label,
      value,
      barClassName: "bg-brand-500",
    }));

  const newEnrollments = newEnrollmentsCount ?? 0;

  const activeClasses = (classes ?? []).filter((c) => c.status === "active");
  const totalCapacity = activeClasses.reduce(
    (sum, c) => sum + (c.capacity ?? 0),
    0
  );
  const takenSeats = takenSeatsCount ?? 0;
  const occupancy =
    totalCapacity > 0 ? Math.round((takenSeats / totalCapacity) * 100) : 0;

  const monthTitle = monthLabel(month);
  const collectedAllTime = [...revenueByMonth.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="כספים"
        description={`תמונת מצב פיננסית מלאה · ${monthTitle}`}
        action={
          <MonthSwitcher
            month={month}
            currentMonth={currentMonth}
            monthTitle={monthTitle}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="הכנסות החודש"
          value={formatCurrency(monthRevenue)}
          icon="💰"
          tone="aqua"
          hint={
            matnasAmount > 0
              ? `${formatCurrency(paymentsRevenue)} תשלומים · ${formatCurrency(matnasAmount)} מתנ״ס`
              : `${monthPaid.length} תשלומים שנגבו`
          }
        />
        <StatCard
          label="שכר מדריכות"
          value={formatCurrency(monthPayroll)}
          icon="👩‍🏫"
          tone="violet"
          hint={`${workingPayrollLines.length} מדריכות פעילות החודש`}
        />
        <StatCard
          label="רווח נטו"
          value={formatCurrency(netProfit)}
          icon="📈"
          tone={netProfit >= 0 ? "brand" : "rose"}
          hint="תשלומים והמתנ״ס בניכוי שכר מדריכות"
        />
        <StatCard
          label="ממתין לגבייה"
          value={formatCurrency(openTotal)}
          icon="⏳"
          tone="amber"
          hint={`${openCharges.length} חיובים פתוחים`}
        />
      </div>

      <MatnasIncomeCard
        month={month}
        monthTitle={monthTitle}
        amount={matnasAmount}
        isOwnEntry={hasOwnRecurringEntry(matnasEntries, month)}
      />

      <Card>
        <CardHeader>
          <CardTitle>הכנסות מול שכר · 12 חודשים</CardTitle>
          <span className="text-xs text-ink-400">לחצו על חודש למעבר אליו</span>
        </CardHeader>
        <CardContent>
          <ColumnChart
            series={[
              { name: "הכנסות", className: "bg-aqua-500" },
              { name: "שכר מדריכות", className: "bg-violet-400" },
            ]}
            data={trendMonths.map((trendMonth) => ({
              key: trendMonth,
              label: shortMonthLabel(trendMonth),
              values: [
                (revenueByMonth.get(trendMonth) ?? 0) +
                  (matnasByMonth.get(trendMonth) ?? 0),
                payrollTotal(
                  buildPayroll(
                    sessionsByMonth.get(trendMonth) ?? [],
                    allInstructors,
                    { month: trendMonth }
                  )
                ),
              ],
              href: `/admin/finance?month=${trendMonth}`,
              active: trendMonth === month,
            }))}
            formatValue={formatCurrency}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>סטטוס גבייה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SplitBar
              label="נגבה (מצטבר)"
              value={collectedAllTime}
              total={collectedAllTime + openTotal}
              barClassName="bg-aqua-500"
              formatValue={formatCurrency}
            />
            <SplitBar
              label="ממתין לגבייה"
              value={openTotal}
              total={collectedAllTime + openTotal}
              barClassName="bg-amber-500"
              formatValue={formatCurrency}
            />
            <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
              <span className="text-ink-500">תפוסת חוגים</span>
              <span className="font-semibold text-ink-900">
                {occupancy}%
                <span className="ms-1.5 text-xs font-normal text-ink-400">
                  {takenSeats} מתוך {totalCapacity} מקומות
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">הרשמות חדשות החודש</span>
              <span className="font-semibold text-ink-900">{newEnrollments}</span>
            </div>
            <Link
              href="/admin/collections"
              className="inline-flex text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              לרשימת הגבייה ←
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>אמצעי תשלום · {monthTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={methodSlices}
              formatValue={formatCurrency}
              centerValue={formatCurrency(paymentsRevenue)}
              centerLabel="נגבה החודש"
              emptyLabel="לא נגבו תשלומים בחודש זה"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי סוג · {monthTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={kindSlices}
              formatValue={formatCurrency}
              centerValue={formatCurrency(monthRevenue)}
              centerLabel="נגבה החודש"
              emptyLabel="אין הכנסות רשומות בחודש זה"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי קטגוריית חוג · {monthTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={revenueByCategory}
              formatValue={formatCurrency}
              emptyLabel="אין הכנסות מחוגים בחודש זה"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>דוח שכר מדריכות · {monthTitle}</CardTitle>
          <span className="font-display text-lg font-bold text-violet-600">
            {formatCurrency(monthPayroll)}
          </span>
        </CardHeader>
        {workingPayrollLines.length > 0 ? (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>מדריכה</TH>
                  <TH className="hidden sm:table-cell">מפגשים</TH>
                  <TH>שעות</TH>
                  <TH className="hidden md:table-cell">תעריף</TH>
                  <TH>לתשלום</TH>
                </TR>
              </THead>
              <TBody>
                {workingPayrollLines.map((line) => (
                  <TR key={line.instructorId}>
                    <TD className="max-w-[9rem] truncate font-semibold text-ink-900 sm:max-w-none">
                      {line.name}
                    </TD>
                    <TD className="hidden sm:table-cell">{line.sessions}</TD>
                    <TD className="whitespace-nowrap text-ink-600">
                      {formatHours(line.hours)}
                    </TD>
                    <TD className="hidden text-ink-600 md:table-cell">
                      {line.payType === "monthly" ? (
                        line.monthlySalary > 0 ? (
                          `${formatCurrency(line.monthlySalary)} לחודש`
                        ) : (
                          <Badge tone="warning">לא הוגדר שכר</Badge>
                        )
                      ) : line.hourlyRate > 0 ? (
                        formatCurrency(line.hourlyRate)
                      ) : (
                        <Badge tone="warning">לא הוגדר תעריף</Badge>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap font-display font-bold text-ink-900">
                      {formatCurrency(line.amount)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-4">
              <RankBars
                items={workingPayrollLines.map((line) => ({
                  key: line.instructorId,
                  label: line.name,
                  sublabel: formatHours(line.hours),
                  value: line.amount,
                  barClassName: "bg-violet-400",
                }))}
                formatValue={formatCurrency}
              />
            </div>
          </>
        ) : (
          <EmptyState
            title="לא התקיימו מפגשים בחודש זה"
            description="שכר שעתי מחושב ממפגשים בפועל. מדריכות בשכר חודשי מופיעות גם בלי מפגשים."
            icon="👩‍🏫"
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>לקוחות מובילים · {monthTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={topCustomers}
              formatValue={formatCurrency}
              emptyLabel="אין לקוחות ששילמו בחודש זה"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי פריט · {monthTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={revenueBySubject}
              formatValue={formatCurrency}
              emptyLabel="אין הכנסות רשומות בחודש זה"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>עסקאות · {monthTitle}</CardTitle>
          <span className="text-sm text-ink-400">{monthTransactions.length} רשומות</span>
        </CardHeader>
        {monthTransactions.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>הורה</TH>
                <TH className="hidden md:table-cell">עבור</TH>
                <TH>סכום</TH>
                <TH className="hidden lg:table-cell">אמצעי</TH>
                <TH className="hidden sm:table-cell">סטטוס</TH>
                <TH>תאריך</TH>
              </TR>
            </THead>
            <TBody>
              {monthTransactions.map((payment) => {
                const badge = adminPaymentBadge(
                  payment.status,
                  payment.payment_method,
                  { cardcomReference: payment.external_reference }
                );
                return (
                <TR key={payment.id}>
                  <TD className="max-w-[9rem] truncate font-semibold text-ink-900 sm:max-w-none">
                    {payment.profiles?.full_name ?? "-"}
                  </TD>
                  <TD className="hidden max-w-[14rem] truncate text-ink-600 md:table-cell">
                    {subjectLabel(payment.enrollments)}
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {formatCurrency(payment.amount)}
                  </TD>
                  <TD className="hidden text-ink-600 lg:table-cell">
                    {payment.payment_method
                      ? PAYMENT_METHOD[payment.payment_method]
                      : "-"}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-500">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </TD>
                </TR>
                );
              })}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            title="אין תנועות בחודש זה"
            icon="💳"
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </Card>
    </div>
  );
}

function MonthSwitcher({
  month,
  currentMonth,
  monthTitle,
}: {
  month: string;
  currentMonth: string;
  monthTitle: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-soft sm:w-auto sm:justify-start">
      <MonthArrow href={`/admin/finance?month=${shiftMonth(month, -1)}`} label="החודש הקודם">
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </MonthArrow>
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-800 sm:min-w-[7.5rem] sm:flex-none">
        {monthTitle}
      </span>
      <MonthArrow href={`/admin/finance?month=${shiftMonth(month, 1)}`} label="החודש הבא">
        <ChevronIcon className="h-4 w-4" />
      </MonthArrow>
      <Link
        href="/admin/finance"
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
          month === currentMonth
            ? "bg-brand-50 text-brand-700"
            : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        )}
      >
        החודש
      </Link>
    </div>
  );
}

function MonthArrow({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
    >
      {children}
    </Link>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
