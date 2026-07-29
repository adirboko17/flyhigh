import Link from "next/link";
import { cn } from "@/utils/cn";

/**
 * גרפים פשוטים מבוססי SVG ו־CSS בלבד, בלי ספריית צד־שלישי.
 * כולם רכיבי שרת — ההסברים מוצגים דרך tooltip נייטיב (title).
 */

export type ChartSeries = {
  name: string;
  /** מחלקת רקע של Tailwind, למשל "bg-aqua-500". */
  className: string;
};

export type ColumnDatum = {
  key: string;
  label: string;
  values: number[];
  href?: string;
  active?: boolean;
};

export function ColumnChart({
  series,
  data,
  formatValue,
  emptyLabel = "אין נתונים להצגה",
}: {
  series: ChartSeries[];
  data: ColumnDatum[];
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(...data.flatMap((d) => d.values), 0);

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className={cn("h-2.5 w-2.5 rounded-full", s.className)} />
            {s.name}
          </span>
        ))}
      </div>

      {/* במובייל אין רוחב ל־12 עמודות, ולכן הגרף מקבל רוחב מינימלי וגלילה אופקית. */}
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
        <div
          className={cn(
            "flex items-stretch gap-1 sm:gap-1.5",
            data.length > 6 && "min-w-[28rem] sm:min-w-0"
          )}
        >
        {data.map((datum) => {
          const column = (
            <>
              <div className="flex h-40 items-end justify-center gap-[3px]">
                {datum.values.map((value, index) => (
                  <div
                    key={series[index]?.name ?? index}
                    title={`${series[index]?.name ?? ""}: ${formatValue(value)}`}
                    className={cn(
                      "w-full rounded-t-md",
                      value > 0 ? series[index]?.className ?? "bg-ink-300" : "bg-ink-100"
                    )}
                    style={{
                      height:
                        max > 0 && value > 0 ? `${Math.max((value / max) * 100, 3)}%` : "2%",
                      maxWidth: series.length === 1 ? 30 : 14,
                    }}
                  />
                ))}
              </div>
              <span
                className={cn(
                  "mt-2 block truncate text-center text-[10px] leading-tight",
                  datum.active ? "font-bold text-brand-700" : "text-ink-400"
                )}
              >
                {datum.label}
              </span>
            </>
          );

          const columnClass = cn(
            "min-w-0 flex-1 rounded-xl p-1 transition-colors",
            datum.active && "bg-brand-50",
            datum.href && "hover:bg-ink-50"
          );

          return datum.href ? (
            <Link key={datum.key} href={datum.href} className={columnClass}>
              {column}
            </Link>
          ) : (
            <div key={datum.key} className={columnClass}>
              {column}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  /** מחלקת צבע טקסט של Tailwind, למשל "text-sky-500". */
  className: string;
};

export function DonutChart({
  slices,
  formatValue,
  centerLabel,
  centerValue,
  emptyLabel = "אין נתונים להצגה",
}: {
  slices: DonutSlice[];
  formatValue: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
  emptyLabel?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        {/* r=15.915 נותן היקף של בדיוק 100, כך שכל אחוז הוא יחידה אחת ב־dasharray. */}
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            strokeWidth="5"
            className="stroke-ink-100"
          />
          {slices.map((slice) => {
            const percent = (slice.value / total) * 100;
            const offset = -cumulative;
            cumulative += percent;

            return (
              <circle
                key={slice.key}
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                strokeWidth="5"
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={offset}
                className={cn("stroke-current", slice.className)}
              >
                <title>{`${slice.label}: ${formatValue(slice.value)}`}</title>
              </circle>
            );
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && (
              <span className="font-display text-lg font-bold text-ink-900">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[11px] text-ink-400">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full bg-current", slice.className)}
              />
              <span className="truncate text-ink-600">{slice.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-900">
              {formatValue(slice.value)}
              <span className="ms-1.5 text-xs font-normal text-ink-400">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type RankItem = {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  barClassName?: string;
};

export function RankBars({
  items,
  formatValue,
  emptyLabel = "אין נתונים להצגה",
}: {
  items: RankItem[];
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 0);

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-400">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3.5">
      {items.map((item, index) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="shrink-0 font-display text-xs font-bold text-ink-300">
                {index + 1}
              </span>
              <span className="min-w-0 truncate font-medium text-ink-800">
                {item.label}
              </span>
              {item.sublabel && (
                <span className="shrink-0 text-xs text-ink-400">{item.sublabel}</span>
              )}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-ink-900">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full", item.barClassName ?? "bg-brand-500")}
              style={{ width: max > 0 ? `${Math.max((item.value / max) * 100, 2)}%` : "0%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** פס יחיד להשוואת ערך מול סך הכל (למשל נגבה מול סך חיובים). */
export function SplitBar({
  label,
  value,
  total,
  barClassName,
  formatValue,
}: {
  label: string;
  value: number;
  total: number;
  barClassName: string;
  formatValue: (value: number) => string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 text-ink-600">
          {label}
          <span className="ms-1.5 text-xs text-ink-400">{percent}%</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-ink-900">
          {formatValue(value)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full", barClassName)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
