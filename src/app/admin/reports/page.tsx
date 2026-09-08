import Link from "next/link";
import { FinanceCompareBoard } from "@/components/admin/FinanceCompareBoard";
import { FinancePayrollCard } from "@/components/admin/FinancePayrollCard";
import { FinanceToolbar } from "@/components/admin/FinanceToolbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  ColumnChart,
  DonutChart,
  RankBars,
  SplitBar,
  type DonutSlice,
  type RankItem,
} from "@/components/ui/Chart";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  REPORTS_PATH,
  deltaIsFavorable,
  financeHref,
  parseFinanceState,
  periodDelta,
} from "@/lib/finance/period";
import { loadFinanceDashboard } from "@/lib/finance/report";
import { reconcilePendingCardcomCheckouts } from "@/lib/payments/cardcomCheckout";
import {
  listMonths,
  shortMonthLabel,
  shiftMonth,
} from "@/lib/scheduling/monthGrid";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "דוחות" };

const METHOD_COLORS: Record<string, string> = {
  credit_card: "text-brand-500",
  bit: "text-violet-500",
  paybox: "text-fuchsia-500",
  pool_pass: "text-emerald-500",
  standing_order: "text-indigo-500",
  cash: "text-emerald-500",
  bank_transfer: "text-sky-500",
  maccabi: "text-amber-500",
  amit: "text-rose-500",
  external: "text-ink-400",
};

const KIND_COLORS: Record<string, string> = {
  class: "text-brand-500",
  program: "text-aqua-500",
  pool_pass: "text-violet-500",
  private_lesson: "text-rose-500",
  matnas: "text-teal-500",
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

function revenueLabel(view: "month" | "year" | "range") {
  if (view === "year") return "הכנסות השנה";
  if (view === "range") return "הכנסות בתקופה";
  return "הכנסות החודש";
}

function statDelta(
  current: number,
  previous: number | undefined,
  invert = false
) {
  if (previous == null) return undefined;
  const delta = periodDelta(current, previous);
  return {
    text: delta.label,
    favorable: deltaIsFavorable(delta.direction, invert),
  };
}

function monthHref(month: string, compareMonth?: string) {
  return financeHref(
    {
      view: "month",
      period: { view: "month", start: "", end: "", label: "", month },
      compare: compareMonth
        ? { view: "month", start: "", end: "", label: "", month: compareMonth }
        : null,
    },
    REPORTS_PATH
  );
}

export default async function AdminReportsPage({
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
  const state = parseFinanceState(params);
  await reconcilePendingCardcomCheckouts();
  const dashboard = await loadFinanceDashboard({
    period: state.period,
    compare: state.compare,
  });

  const { snapshot, compareSnapshot } = dashboard;
  const periodTitle = snapshot.period.label;

  const methodSlices: DonutSlice[] = snapshot.methodTotals.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    className: METHOD_COLORS[row.key] ?? "text-ink-400",
  }));

  const kindSlices: DonutSlice[] = snapshot.kindTotals.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    className: KIND_COLORS[row.key] ?? "text-ink-400",
  }));

  const topCustomers: RankItem[] = snapshot.customerTotals.slice(0, 8).map((row) => ({
    key: row.key,
    label: row.label,
    sublabel: row.extra,
    value: row.value,
    barClassName: "bg-aqua-500",
  }));

  const revenueByCategory: RankItem[] = snapshot.categoryTotals.map((row, index) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    barClassName: CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length],
  }));

  const revenueBySubject: RankItem[] = snapshot.subjectTotals.slice(0, 8).map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    barClassName: "bg-brand-500",
  }));

  const yearMonths =
    snapshot.period.view === "year" && snapshot.period.year
      ? listMonths(`${snapshot.period.year}-12`, 12)
      : dashboard.trendMonths;

  const compareYearMonths =
    compareSnapshot?.period.view === "year" && compareSnapshot.period.year
      ? listMonths(`${compareSnapshot.period.year}-12`, 12)
      : null;

  const showYearCompareChart = Boolean(compareYearMonths);
  const showMonthYoYChart = Boolean(
    compareSnapshot?.period.view === "month" &&
      snapshot.period.month &&
      compareSnapshot.period.month === shiftMonth(snapshot.period.month, -12)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="דוחות"
        description={`השוואת תקופות, פילוחים והורדת Excel · ${periodTitle}`}
        action={
          <Link
            href="/admin/finance"
            className="inline-flex items-center justify-center rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            לתמונת המצב החודשית
          </Link>
        }
      />

      <FinanceToolbar
        view={state.view}
        period={state.period}
        compare={state.compare}
        currentMonth={state.currentMonth}
        currentYear={state.currentYear}
        basePath={REPORTS_PATH}
      />

      {compareSnapshot ? (
        <FinanceCompareBoard current={snapshot} previous={compareSnapshot} />
      ) : (
        <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-4 py-3 text-sm text-ink-600">
          בחרו תקופה להשוואה למעלה כדי לראות הפרשים, אחוזים ומגמות זו לצד זו.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={revenueLabel(snapshot.period.view)}
          value={formatCurrency(snapshot.revenue)}
          icon="💰"
          tone="aqua"
          delta={statDelta(snapshot.revenue, compareSnapshot?.revenue)}
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
          delta={statDelta(snapshot.payroll, compareSnapshot?.payroll, true)}
          hint={`${snapshot.payrollLines.length} מדריכות פעילות`}
        />
        <StatCard
          label="רווח נטו"
          value={formatCurrency(snapshot.netProfit)}
          icon="📈"
          tone={snapshot.netProfit >= 0 ? "brand" : "rose"}
          delta={statDelta(snapshot.netProfit, compareSnapshot?.netProfit)}
          hint="תשלומים והמתנ״ס בניכוי שכר מדריכות"
        />
        <StatCard
          label="הרשמות חדשות"
          value={snapshot.newEnrollments}
          icon="🆕"
          tone="amber"
          delta={statDelta(
            snapshot.newEnrollments,
            compareSnapshot?.newEnrollments
          )}
          hint={periodTitle}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {showYearCompareChart
              ? `הכנסות לפי חודש · ${snapshot.period.year} מול ${compareSnapshot?.period.year}`
              : showMonthYoYChart
                ? "הכנסות חודש מול אותו חודש אשתקד"
                : snapshot.period.view === "year"
                  ? `הכנסות מול שכר · ${snapshot.period.year}`
                  : "הכנסות מול שכר · 12 חודשים"}
          </CardTitle>
          <span className="text-xs text-ink-400">
            {showYearCompareChart || showMonthYoYChart
              ? "כל עמודה משווה את אותו חודש בשתי התקופות"
              : "לחצו על חודש למעבר אליו"}
          </span>
        </CardHeader>
        <CardContent>
          {showYearCompareChart && compareYearMonths ? (
            <ColumnChart
              series={[
                { name: String(snapshot.period.year), className: "bg-aqua-500" },
                { name: String(compareSnapshot?.period.year), className: "bg-ink-300" },
              ]}
              data={yearMonths.map((month, index) => ({
                key: month,
                label: shortMonthLabel(month),
                values: [
                  (dashboard.revenueByMonth.get(month) ?? 0) +
                    (dashboard.matnasByMonth.get(month) ?? 0),
                  (dashboard.revenueByMonth.get(compareYearMonths[index]) ?? 0) +
                    (dashboard.matnasByMonth.get(compareYearMonths[index]) ?? 0),
                ],
                href: monthHref(month, compareYearMonths[index]),
                active: snapshot.period.month === month,
              }))}
              formatValue={formatCurrency}
            />
          ) : showMonthYoYChart ? (
            <ColumnChart
              series={[
                { name: snapshot.period.label, className: "bg-aqua-500" },
                { name: compareSnapshot?.period.label ?? "אשתקד", className: "bg-ink-300" },
              ]}
              data={dashboard.trendMonths.map((month) => {
                const lastYear = shiftMonth(month, -12);
                return {
                  key: month,
                  label: shortMonthLabel(month),
                  values: [
                    (dashboard.revenueByMonth.get(month) ?? 0) +
                      (dashboard.matnasByMonth.get(month) ?? 0),
                    (dashboard.revenueByMonth.get(lastYear) ?? 0) +
                      (dashboard.matnasByMonth.get(lastYear) ?? 0),
                  ],
                  href: monthHref(month, lastYear),
                  active: snapshot.period.month === month,
                };
              })}
              formatValue={formatCurrency}
            />
          ) : (
            <ColumnChart
              series={[
                { name: "הכנסות", className: "bg-aqua-500" },
                { name: "שכר מדריכות", className: "bg-violet-400" },
              ]}
              data={yearMonths.map((month) => ({
                key: month,
                label: shortMonthLabel(month),
                values: [
                  (dashboard.revenueByMonth.get(month) ?? 0) +
                    (dashboard.matnasByMonth.get(month) ?? 0),
                  dashboard.payrollByMonth.get(month) ?? 0,
                ],
                href: monthHref(month),
                active: snapshot.period.month === month,
              }))}
              formatValue={formatCurrency}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>סטטוס גבייה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SplitBar
              label="נגבה (בחלון המוצג)"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>אמצעי תשלום · {periodTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={methodSlices}
              formatValue={formatCurrency}
              centerValue={formatCurrency(snapshot.paymentsRevenue)}
              centerLabel="נגבה בתקופה"
              emptyLabel="לא נגבו תשלומים בתקופה זו"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי סוג · {periodTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={kindSlices}
              formatValue={formatCurrency}
              centerValue={formatCurrency(snapshot.revenue)}
              centerLabel="נגבה בתקופה"
              emptyLabel="אין הכנסות רשומות בתקופה זו"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי קטגוריית חוג · {periodTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={revenueByCategory}
              formatValue={formatCurrency}
              emptyLabel="אין הכנסות מחוגים בתקופה זו"
            />
          </CardContent>
        </Card>
      </div>

      <FinancePayrollCard snapshot={snapshot} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>לקוחות מובילים · {periodTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={topCustomers}
              formatValue={formatCurrency}
              emptyLabel="אין לקוחות ששילמו בתקופה זו"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הכנסות לפי פריט · {periodTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <RankBars
              items={revenueBySubject}
              formatValue={formatCurrency}
              emptyLabel="אין הכנסות רשומות בתקופה זו"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
