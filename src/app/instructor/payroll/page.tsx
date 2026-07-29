import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ColumnChart } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import { formatHours } from "@/lib/finance/payroll";
import { loadInstructorPayroll } from "@/lib/finance/instructorPayroll";
import { monthLabel, shortMonthLabel } from "@/lib/scheduling/monthGrid";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "שכר ופעילות" };

const TREND_MONTHS = 6;

export default async function InstructorPayrollPage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const {
    currentMonth,
    monthlySummary,
    thisMonth,
    sessionsThisMonth,
    rate,
  } = await loadInstructorPayroll(supabase, instructor, TREND_MONTHS);

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
