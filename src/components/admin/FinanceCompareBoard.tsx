import { Card } from "@/components/ui/Card";
import {
  deltaIsFavorable,
  periodDelta,
} from "@/lib/finance/period";
import type { FinanceSnapshot } from "@/lib/finance/report";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

type Metric = {
  key: string;
  label: string;
  current: number;
  previous: number;
  money: boolean;
  invert?: boolean;
};

function formatValue(value: number, money: boolean) {
  return money ? formatCurrency(value) : String(value);
}

function insight(current: FinanceSnapshot, previous: FinanceSnapshot) {
  const revenue = periodDelta(current.revenue, previous.revenue);
  const profit = periodDelta(current.netProfit, previous.netProfit);
  const payroll = periodDelta(current.payroll, previous.payroll);
  const vs = previous.period.label;

  if (revenue.direction === "up" && profit.direction === "up") {
    return `צמיחה מול ${vs}: ההכנסות עלו ב־${Math.abs(revenue.percent ?? 0)}% והרווח עלה איתן.`;
  }
  if (revenue.direction === "up" && profit.direction === "down") {
    return `ההכנסות עלו מול ${vs}, אבל הרווח ירד — כדאי לבדוק את השכר וההוצאות.`;
  }
  if (revenue.direction === "down" && profit.direction === "up") {
    return `ההכנסות ירדו מול ${vs}, אבל הרווח השתפר בזכות ירידה בהוצאות.`;
  }
  if (revenue.direction === "down" && profit.direction === "down") {
    return `התקופה חלשה יותר מול ${vs}: גם ההכנסות וגם הרווח ירדו.`;
  }
  if (payroll.direction === "up" && revenue.direction === "flat") {
    return `ההכנסות יציבות מול ${vs}, והשכר עלה.`;
  }
  return `השוואה מול ${vs} — ההפרשים מוצגים למטה לפי כל מדד.`;
}

export function FinanceCompareBoard({
  current,
  previous,
}: {
  current: FinanceSnapshot;
  previous: FinanceSnapshot;
}) {
  const metrics: Metric[] = [
    { key: "revenue", label: "הכנסות", current: current.revenue, previous: previous.revenue, money: true },
    { key: "paid", label: "תשלומים שנגבו", current: current.paymentsRevenue, previous: previous.paymentsRevenue, money: true },
    { key: "payroll", label: "שכר מדריכות", current: current.payroll, previous: previous.payroll, money: true, invert: true },
    { key: "profit", label: "רווח נטו", current: current.netProfit, previous: previous.netProfit, money: true },
    { key: "enroll", label: "הרשמות חדשות", current: current.newEnrollments, previous: previous.newEnrollments, money: false },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-bl from-brand-50 via-white to-aqua-50/60 shadow-card">
      <div className="grid gap-4 border-b border-brand-100/80 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <PeriodSide
          eyebrow="התקופה הנבחרת"
          label={current.period.label}
          tone="current"
        />
        <div className="flex justify-center lg:hidden">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-700 shadow-sm ring-1 ring-brand-100">
            מול
          </span>
        </div>
        <div className="hidden justify-center lg:flex">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xs font-black tracking-wide text-brand-700 shadow-sm ring-1 ring-brand-100">
            מול
          </span>
        </div>
        <PeriodSide
          eyebrow="משווים מול"
          label={previous.period.label}
          tone="compare"
        />
      </div>

      <p className="px-4 py-4 text-sm leading-relaxed text-ink-700 sm:px-6">
        {insight(current, previous)}
      </p>

      <div className="flex flex-wrap items-center gap-4 px-4 pb-3 text-xs text-ink-500 sm:px-6">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-aqua-500" />
          התקופה הנבחרת
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-300" />
          התקופה המושווית
        </span>
      </div>

      <div className="grid gap-3 px-4 pb-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        {metrics.map((metric) => (
          <MetricTile key={metric.key} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function PeriodSide({
  eyebrow,
  label,
  tone,
}: {
  eyebrow: string;
  label: string;
  tone: "current" | "compare";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3",
        tone === "current" ? "bg-aqua-500/10" : "bg-white/80 ring-1 ring-ink-100"
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold",
          tone === "current" ? "text-aqua-800" : "text-ink-500"
        )}
      >
        {eyebrow}
      </p>
      <p className="mt-1 font-display text-lg font-extrabold text-ink-900">{label}</p>
    </div>
  );
}

function MetricTile({ metric }: { metric: Metric }) {
  const delta = periodDelta(metric.current, metric.previous);
  const favorable = deltaIsFavorable(delta.direction, metric.invert);
  const max = Math.max(Math.abs(metric.current), Math.abs(metric.previous), 1);

  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 shadow-sm">
      <p className="text-xs font-semibold text-ink-500">{metric.label}</p>
      <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink-900">
        {formatValue(metric.current, metric.money)}
      </p>
      <p className="mt-0.5 text-xs text-ink-400">
        מול {formatValue(metric.previous, metric.money)}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-aqua-500"
            style={{ width: `${Math.min(100, (Math.abs(metric.current) / max) * 100)}%` }}
          />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-ink-300"
            style={{ width: `${Math.min(100, (Math.abs(metric.previous) / max) * 100)}%` }}
          />
        </div>
      </div>

      <p
        className={cn(
          "mt-3 text-sm font-bold",
          favorable === true && "text-aqua-700",
          favorable === false && "text-rose-600",
          favorable == null && "text-ink-500"
        )}
      >
        {delta.label}
        {metric.money && delta.amount !== 0
          ? ` · ${delta.amount > 0 ? "+" : "−"}${formatCurrency(Math.abs(delta.amount))}`
          : ""}
      </p>
    </div>
  );
}
