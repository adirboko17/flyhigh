import Link from "next/link";
import { redirect } from "next/navigation";
import { FinancePayrollCard } from "@/components/admin/FinancePayrollCard";
import { MatnasIncomeCard } from "@/components/admin/MatnasIncomeCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ColumnChart, SplitBar } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { PAYMENT_METHOD } from "@/lib/constants";
import {
  FINANCE_PATH,
  REPORTS_PATH,
  financeQuery,
  parseFinanceState,
} from "@/lib/finance/period";
import { loadFinanceDashboard } from "@/lib/finance/report";
import { hasOwnRecurringEntry } from "@/lib/finance/recurringIncome";
import { reconcilePendingCardcomCheckouts } from "@/lib/payments/cardcomCheckout";
import { shortMonthLabel, shiftMonth } from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "כספים" };

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    year?: string;
    from?: string;
    to?: string;
    compare?: string;
    cMonth?: string;
    cYear?: string;
    cFrom?: string;
    cTo?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.view === "year" || params.view === "range" || params.compare) {
    redirect(`${REPORTS_PATH}${financeQuery(parseFinanceState(params))}`);
  }

  await reconcilePendingCardcomCheckouts();
  const state = parseFinanceState({ month: params.month });
  const dashboard = await loadFinanceDashboard({
    period: state.period,
    compare: null,
  });
  const { snapshot } = dashboard;
  const periodTitle = snapshot.period.label;
  const month = snapshot.period.month ?? state.currentMonth;

  return (
    <div className="space-y-6">
      <PageHeader
        title="כספים"
        description={`תמונת מצב חודשית · ${periodTitle}`}
        action={
          <>
            <Link
              href={REPORTS_PATH}
              className="inline-flex items-center justify-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              דוחות והשוואות
            </Link>
            <MonthSwitcher
              month={month}
              currentMonth={state.currentMonth}
              monthTitle={periodTitle}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="הכנסות החודש"
          value={formatCurrency(snapshot.revenue)}
          icon="💰"
          tone="aqua"
          hint={
            snapshot.matnasAmount > 0
              ? `${formatCurrency(snapshot.paymentsRevenue)} תשלומים · ${formatCurrency(snapshot.matnasAmount)} מתנ״ס`
              : `${snapshot.paidCount} תשלומים שנגבו`
          }
        />
        <StatCard
          label="שכר מדריכות"
          value={formatCurrency(snapshot.payroll)}
          icon="👩‍🏫"
          tone="violet"
          hint={`${snapshot.payrollLines.length} מדריכות פעילות`}
        />
        <StatCard
          label="רווח נטו"
          value={formatCurrency(snapshot.netProfit)}
          icon="📈"
          tone={snapshot.netProfit >= 0 ? "brand" : "rose"}
          hint="תשלומים והמתנ״ס בניכוי שכר מדריכות"
        />
        <StatCard
          label="ממתין לגבייה"
          value={formatCurrency(dashboard.openTotal)}
          icon="⏳"
          tone="amber"
          hint={`${dashboard.openChargesCount} חיובים פתוחים`}
        />
      </div>

      {snapshot.period.month && (
        <MatnasIncomeCard
          month={snapshot.period.month}
          monthTitle={periodTitle}
          amount={snapshot.matnasAmount}
          isOwnEntry={hasOwnRecurringEntry(dashboard.matnasEntries, snapshot.period.month)}
        />
      )}

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
            data={dashboard.trendMonths.map((key) => ({
              key,
              label: shortMonthLabel(key),
              values: [
                (dashboard.revenueByMonth.get(key) ?? 0) +
                  (dashboard.matnasByMonth.get(key) ?? 0),
                dashboard.payrollByMonth.get(key) ?? 0,
              ],
              href: `${FINANCE_PATH}?month=${key}`,
              active: month === key,
            }))}
            formatValue={formatCurrency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>סטטוס גבייה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SplitBar
            label="נגבה החודש"
            value={dashboard.collectedInWindow}
            total={dashboard.collectedInWindow + dashboard.openTotal}
            barClassName="bg-aqua-500"
            formatValue={formatCurrency}
          />
          <SplitBar
            label="ממתין לגבייה"
            value={dashboard.openTotal}
            total={dashboard.collectedInWindow + dashboard.openTotal}
            barClassName="bg-amber-500"
            formatValue={formatCurrency}
          />
          <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
            <span className="text-ink-500">תפוסת חוגים</span>
            <span className="font-semibold text-ink-900">
              {dashboard.occupancy}%
              <span className="ms-1.5 text-xs font-normal text-ink-400">
                {dashboard.takenSeats} מתוך {dashboard.totalCapacity} מקומות
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">הרשמות חדשות החודש</span>
            <span className="font-semibold text-ink-900">{snapshot.newEnrollments}</span>
          </div>
          <Link
            href="/admin/collections"
            className="inline-flex text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            לרשימת הגבייה ←
          </Link>
        </CardContent>
      </Card>

      <FinancePayrollCard snapshot={snapshot} />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>עסקאות · {periodTitle}</CardTitle>
          <span className="text-sm text-ink-400">
            {snapshot.transactions.length} רשומות
          </span>
        </CardHeader>
        {snapshot.transactions.length > 0 ? (
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
              {snapshot.transactions.map((payment) => (
                <TR key={payment.id}>
                  <TD className="max-w-[9rem] truncate font-semibold text-ink-900 sm:max-w-none">
                    {payment.parentName}
                  </TD>
                  <TD className="hidden max-w-[14rem] truncate text-ink-600 md:table-cell">
                    {payment.subject}
                  </TD>
                  <TD className="whitespace-nowrap font-medium">
                    {formatCurrency(payment.amount)}
                  </TD>
                  <TD className="hidden text-ink-600 lg:table-cell">
                    {payment.method ? PAYMENT_METHOD[payment.method] : "-"}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <Badge tone={payment.badgeTone}>{payment.badgeLabel}</Badge>
                  </TD>
                  <TD className="whitespace-nowrap text-ink-500">
                    {formatDate(payment.date)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <EmptyState
            title="אין תנועות בתקופה זו"
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
      <MonthArrow href={`${FINANCE_PATH}?month=${shiftMonth(month, -1)}`} label="החודש הקודם">
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </MonthArrow>
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-800 sm:min-w-[7.5rem] sm:flex-none">
        {monthTitle}
      </span>
      <MonthArrow href={`${FINANCE_PATH}?month=${shiftMonth(month, 1)}`} label="החודש הבא">
        <ChevronIcon className="h-4 w-4" />
      </MonthArrow>
      <Link
        href={FINANCE_PATH}
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
