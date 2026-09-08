import Link from "next/link";
import { FinanceCompareBoard } from "@/components/admin/FinanceCompareBoard";
import { FinanceToolbar } from "@/components/admin/FinanceToolbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ColumnChart } from "@/components/ui/Chart";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  REPORTS_PATH,
  defaultComparePeriod,
  financeHref,
  parseFinanceState,
} from "@/lib/finance/period";
import { loadFinanceDashboard } from "@/lib/finance/report";
import { reconcilePendingCardcomCheckouts } from "@/lib/payments/cardcomCheckout";
import {
  listMonths,
  shortMonthLabel,
  shiftMonth,
} from "@/lib/scheduling/monthGrid";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "השוואות" };

function monthHref(month: string, compareMonth: string) {
  return financeHref(
    {
      view: "month",
      period: { view: "month", start: "", end: "", label: "", month },
      compare: {
        view: "month",
        start: "",
        end: "",
        label: "",
        month: compareMonth,
      },
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
  const parsed = parseFinanceState(params);
  const compare = parsed.compare ?? defaultComparePeriod(parsed.period);
  await reconcilePendingCardcomCheckouts();
  const dashboard = await loadFinanceDashboard({
    period: parsed.period,
    compare,
  });

  const { snapshot, compareSnapshot } = dashboard;
  if (!compareSnapshot) return null;

  const yearMonths =
    snapshot.period.view === "year" && snapshot.period.year
      ? listMonths(`${snapshot.period.year}-12`, 12)
      : dashboard.trendMonths;

  const compareYearMonths =
    compareSnapshot.period.view === "year" && compareSnapshot.period.year
      ? listMonths(`${compareSnapshot.period.year}-12`, 12)
      : null;

  const showYearCompareChart = Boolean(compareYearMonths);
  const showMonthYoYChart = Boolean(
    compareSnapshot.period.view === "month" &&
      snapshot.period.month &&
      compareSnapshot.period.month === shiftMonth(snapshot.period.month, -12)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="השוואות"
        description={`${snapshot.period.label} מול ${compareSnapshot.period.label}`}
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
        view={parsed.view}
        period={parsed.period}
        compare={compare}
        currentMonth={parsed.currentMonth}
        currentYear={parsed.currentYear}
        basePath={REPORTS_PATH}
        alwaysCompare
      />

      <FinanceCompareBoard current={snapshot} previous={compareSnapshot} />

      {(showYearCompareChart || showMonthYoYChart) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {showYearCompareChart
                ? `הכנסות לפי חודש · ${snapshot.period.year} מול ${compareSnapshot.period.year}`
                : "הכנסות חודש מול אותו חודש אשתקד"}
            </CardTitle>
            <span className="text-xs text-ink-400">
              כל עמודה משווה את אותו חודש בשתי התקופות
            </span>
          </CardHeader>
          <CardContent>
            {showYearCompareChart && compareYearMonths ? (
              <ColumnChart
                series={[
                  { name: String(snapshot.period.year), className: "bg-aqua-500" },
                  {
                    name: String(compareSnapshot.period.year),
                    className: "bg-ink-300",
                  },
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
            ) : (
              <ColumnChart
                series={[
                  { name: snapshot.period.label, className: "bg-aqua-500" },
                  {
                    name: compareSnapshot.period.label,
                    className: "bg-ink-300",
                  },
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
