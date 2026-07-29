import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ColumnChart } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import {
  buildPayroll,
  formatHours,
  type PayrollSession,
} from "@/lib/finance/payroll";
import {
  listMonths,
  monthLabel,
  monthOf,
  monthRange,
  shortMonthLabel,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "שכר ופעילות" };

const TREND_MONTHS = 6;

export default async function InstructorPayrollPage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const currentMonth = monthOf(todayInIsrael());
  const trendMonths = listMonths(currentMonth, TREND_MONTHS);
  const trendStart = monthRange(trendMonths[0]).start;
  const { end: monthEnd } = monthRange(currentMonth);

  const { data: classes } = instructor
    ? await supabase
        .from("classes")
        .select("id, title")
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
        .select(
          "class_id, session_date, start_time, end_time, status, substitute_instructor_id, classes(title)"
        )
        .or(ownershipFilter)
        .gte("session_date", trendStart)
        .lte("session_date", monthEnd)
    : { data: [] };

  // מפגש שהועבר למחליפה יורד מהשכר של המדריכה הקבועה ונזקף למחליפה.
  const mySessions = (sessions ?? []).filter((session) =>
    session.substitute_instructor_id
      ? session.substitute_instructor_id === instructor?.id
      : true
  );

  const payrollInstructor = instructor
    ? [
        {
          id: instructor.id,
          full_name: instructor.full_name,
          hourly_rate: instructor.hourly_rate,
        },
      ]
    : [];

  const toPayrollSession = (session: {
    status: PayrollSession["status"];
    start_time: string;
    end_time: string;
  }): PayrollSession => ({
    instructorId: instructor?.id ?? null,
    status: session.status,
    startTime: session.start_time,
    endTime: session.end_time,
  });

  const monthlySummary = trendMonths.map((month) => {
    const monthSessions = mySessions
      .filter((session) => session.session_date.startsWith(month))
      .map(toPayrollSession);
    const [line] = buildPayroll(monthSessions, payrollInstructor);

    return {
      month,
      sessions: line?.sessions ?? 0,
      hours: line?.hours ?? 0,
      amount: line?.amount ?? 0,
    };
  });

  const thisMonth =
    monthlySummary.find((entry) => entry.month === currentMonth) ?? {
      month: currentMonth,
      sessions: 0,
      hours: 0,
      amount: 0,
    };

  const rate = Number(instructor?.hourly_rate ?? 0);
  const sessionsThisMonth = mySessions.filter(
    (session) =>
      session.session_date.startsWith(currentMonth) && session.status !== "cancelled"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="שכר ופעילות"
        description={`סיכום הפעילות והשכר שלך · ${monthLabel(currentMonth)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="תעריף שעתי"
          value={formatCurrency(rate)}
          icon="💰"
          tone="brand"
        />
        <StatCard
          label="מפגשים החודש"
          value={thisMonth.sessions}
          icon="📅"
          tone="aqua"
        />
        <StatCard
          label="שעות החודש"
          value={formatHours(thisMonth.hours)}
          icon="⏱️"
          tone="amber"
        />
        <StatCard
          label="שכר החודש"
          value={formatCurrency(thisMonth.amount)}
          icon="🧮"
          tone="violet"
          hint="לפי שעות המפגשים בפועל"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>שכר לפי חודש</CardTitle>
        </CardHeader>
        <CardContent>
          <ColumnChart
            series={[{ name: "שכר", className: "bg-violet-400" }]}
            data={monthlySummary.map((entry) => ({
              key: entry.month,
              label: shortMonthLabel(entry.month),
              values: [entry.amount],
              active: entry.month === currentMonth,
            }))}
            formatValue={formatCurrency}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>פירוט חודשי</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>חודש</TH>
              <TH className="hidden sm:table-cell">מפגשים</TH>
              <TH>שעות</TH>
              <TH>שכר</TH>
            </TR>
          </THead>
          <TBody>
            {[...monthlySummary].reverse().map((entry) => (
              <TR key={entry.month}>
                <TD className="whitespace-nowrap font-semibold text-ink-900">
                  {monthLabel(entry.month)}
                </TD>
                <TD className="hidden sm:table-cell">{entry.sessions}</TD>
                <TD className="whitespace-nowrap text-ink-600">
                  {formatHours(entry.hours)}
                </TD>
                <TD className="whitespace-nowrap font-display font-bold text-ink-900">
                  {formatCurrency(entry.amount)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>המפגשים שלי החודש</CardTitle>
        </CardHeader>
        {sessionsThisMonth.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>תאריך</TH>
                <TH>חוג</TH>
                <TH>שעות</TH>
              </TR>
            </THead>
            <TBody>
              {[...sessionsThisMonth]
                .sort((a, b) => a.session_date.localeCompare(b.session_date))
                .map((session) => (
                  <TR key={`${session.class_id}-${session.session_date}-${session.start_time}`}>
                    <TD className="whitespace-nowrap font-semibold text-ink-900">
                      {session.session_date.split("-").reverse().join("/")}
                    </TD>
                    <TD className="text-ink-600">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="min-w-0">
                          {session.classes?.title ?? "-"}
                        </span>
                        {session.substitute_instructor_id && (
                          <Badge tone="warning">החלפה</Badge>
                        )}
                      </span>
                    </TD>
                    <TD
                      dir="ltr"
                      className="whitespace-nowrap text-right tabular-nums text-ink-600"
                    >
                      {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)}
                    </TD>
                  </TR>
                ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            title="אין מפגשים החודש"
            description="השכר מחושב משעות המפגשים בפועל, ללא מפגשים שבוטלו."
            icon="📅"
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </Card>
    </div>
  );
}
