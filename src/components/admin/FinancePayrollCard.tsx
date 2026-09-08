import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RankBars } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatHours } from "@/lib/finance/payroll";
import type { FinanceSnapshot } from "@/lib/finance/report";
import { formatCurrency } from "@/utils/format";

export function FinancePayrollCard({ snapshot }: { snapshot: FinanceSnapshot }) {
  const periodTitle = snapshot.period.label;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>דוח שכר מדריכות · {periodTitle}</CardTitle>
        <span className="font-display text-lg font-bold text-violet-600">
          {formatCurrency(snapshot.payroll)}
        </span>
      </CardHeader>
      {snapshot.payrollLines.length > 0 ? (
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
              {snapshot.payrollLines.map((line) => (
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
              items={snapshot.payrollLines.map((line) => ({
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
          title="לא התקיימו מפגשים בתקופה זו"
          description="שכר שעתי מחושב ממפגשים בפועל. מדריכות בשכר חודשי מופיעות גם בלי מפגשים."
          icon="👩‍🏫"
          className="rounded-none border-0 bg-transparent"
        />
      )}
    </Card>
  );
}
