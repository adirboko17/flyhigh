"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import {
  REPORTS_PATH,
  activeComparePreset,
  comparePresets,
  financeHref,
  type FinancePeriod,
  type FinanceView,
} from "@/lib/finance/period";
import { monthLabel, shiftMonth } from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";

type ToolbarState = {
  view: FinanceView;
  period: FinancePeriod;
  compare: FinancePeriod | null;
};

function hrefFor(state: ToolbarState, path: string) {
  return financeHref(
    { view: state.view, period: state.period, compare: state.compare },
    path
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

export function FinanceToolbar({
  view,
  period,
  compare,
  currentMonth,
  currentYear,
  basePath = REPORTS_PATH,
}: {
  view: FinanceView;
  period: FinancePeriod;
  compare: FinancePeriod | null;
  currentMonth: string;
  currentYear: number;
  basePath?: string;
}) {
  const state: ToolbarState = { view, period, compare };
  const exportHref = hrefFor(state, `${basePath}/export`);

  const viewTabs = useMemo(
    () =>
      [
        {
          id: "month" as const,
          label: "חודש",
          href: financeHref(
            {
              view: "month",
              period: {
                view: "month",
                start: "",
                end: "",
                label: "",
                month: period.month ?? currentMonth,
              },
              compare: null,
            },
            basePath
          ),
        },
        {
          id: "year" as const,
          label: "שנה",
          href: financeHref(
            {
              view: "year",
              period: {
                view: "year",
                start: "",
                end: "",
                label: "",
                year: period.year ?? currentYear,
              },
              compare: null,
            },
            basePath
          ),
        },
        {
          id: "range" as const,
          label: "טווח תאריכים",
          href: `${basePath}?view=range&from=${period.start}&to=${period.end}`,
        },
      ] as const,
    [period, currentMonth, currentYear, basePath]
  );

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-soft sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex rounded-2xl border border-ink-100 bg-ink-50 p-1">
          {viewTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex-1 rounded-xl px-3 py-1.5 text-center text-sm font-semibold transition-colors sm:flex-none",
                view === tab.id
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-ink-500 hover:text-ink-800"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <a
          href={exportHref}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <Icon name="download" size={16} />
          הורדת דוח Excel
        </a>
      </div>

      {view === "month" && period.month && (
        <MonthSwitcher
          path={basePath}
          month={period.month}
          currentMonth={currentMonth}
          compare={compare}
        />
      )}

      {view === "year" && period.year && (
        <YearSwitcher
          path={basePath}
          year={period.year}
          currentYear={currentYear}
          compare={compare}
        />
      )}

      {view === "range" && (
        <RangeForm
          path={basePath}
          start={period.start}
          end={period.end}
          compare={compare}
        />
      )}

      <CompareSection
        path={basePath}
        view={view}
        period={period}
        compare={compare}
      />
    </div>
  );
}

function MonthSwitcher({
  path,
  month,
  currentMonth,
  compare,
}: {
  path: string;
  month: string;
  currentMonth: string;
  compare: FinancePeriod | null;
}) {
  const withCompare = (nextMonth: string) =>
    financeHref(
      {
        view: "month",
        period: { view: "month", start: "", end: "", label: "", month: nextMonth },
        compare,
      },
      path
    );

  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-ink-100 bg-ink-50/70 p-1.5 sm:w-auto sm:justify-start">
      <NavArrow href={withCompare(shiftMonth(month, -1))} label="החודש הקודם">
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </NavArrow>
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-800 sm:min-w-[7.5rem] sm:flex-none">
        {monthLabel(month)}
      </span>
      <NavArrow href={withCompare(shiftMonth(month, 1))} label="החודש הבא">
        <ChevronIcon className="h-4 w-4" />
      </NavArrow>
      <Link
        href={financeHref(
          {
            view: "month",
            period: {
              view: "month",
              start: "",
              end: "",
              label: "",
              month: currentMonth,
            },
            compare,
          },
          path
        )}
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

function YearSwitcher({
  path,
  year,
  currentYear,
  compare,
}: {
  path: string;
  year: number;
  currentYear: number;
  compare: FinancePeriod | null;
}) {
  const withCompare = (nextYear: number) =>
    financeHref(
      {
        view: "year",
        period: { view: "year", start: "", end: "", label: "", year: nextYear },
        compare,
      },
      path
    );

  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-ink-100 bg-ink-50/70 p-1.5 sm:w-auto sm:justify-start">
      <NavArrow href={withCompare(year - 1)} label="השנה הקודמת">
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </NavArrow>
      <span className="min-w-[4.5rem] flex-1 text-center text-sm font-semibold text-ink-800 sm:flex-none">
        {year}
      </span>
      <NavArrow href={withCompare(year + 1)} label="השנה הבאה">
        <ChevronIcon className="h-4 w-4" />
      </NavArrow>
      <Link
        href={financeHref(
          {
            view: "year",
            period: {
              view: "year",
              start: "",
              end: "",
              label: "",
              year: currentYear,
            },
            compare,
          },
          path
        )}
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
          year === currentYear
            ? "bg-brand-50 text-brand-700"
            : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        )}
      >
        השנה
      </Link>
    </div>
  );
}

function RangeForm({
  path,
  start,
  end,
  compare,
}: {
  path: string;
  start: string;
  end: string;
  compare: FinancePeriod | null;
}) {
  return (
    <form method="get" action={path} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <input type="hidden" name="view" value="range" />
      {compare && <input type="hidden" name="compare" value="1" />}
      {compare?.view === "range" && (
        <>
          <input type="hidden" name="cFrom" value={compare.start} />
          <input type="hidden" name="cTo" value={compare.end} />
        </>
      )}
      <Field label="מתאריך" htmlFor="financeFrom">
        <Input id="financeFrom" type="date" name="from" defaultValue={start} required />
      </Field>
      <Field label="עד תאריך" htmlFor="financeTo">
        <Input id="financeTo" type="date" name="to" defaultValue={end} required />
      </Field>
      <div className="flex items-end">
        <Button type="submit" size="sm" className="w-full sm:w-auto">
          הצגת טווח
        </Button>
      </div>
    </form>
  );
}

function CompareSection({
  path,
  view,
  period,
  compare,
}: {
  path: string;
  view: FinanceView;
  period: FinancePeriod;
  compare: FinancePeriod | null;
}) {
  const presets = comparePresets(period);
  const active = activeComparePreset(period, compare);
  const offHref = financeHref({ view, period, compare: null }, path);

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-l from-brand-50/90 to-aqua-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-[15px] font-extrabold text-ink-900">
            השוואה לתקופה אחרת
          </p>
          <p className="mt-0.5 text-sm text-ink-500">
            בחרו במהירות מול מה להשוות את {period.label}
          </p>
        </div>
        {compare && (
          <Link
            href={offHref}
            className="text-sm font-semibold text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
          >
            ביטול השוואה
          </Link>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => {
          const selected = active === preset.id;
          return (
            <Link
              key={preset.id}
              href={financeHref({ view, period, compare: preset.period }, path)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-right transition-all",
                selected
                  ? "border-brand-500 bg-white shadow-sm ring-2 ring-brand-200"
                  : "border-transparent bg-white/70 hover:border-brand-200 hover:bg-white"
              )}
            >
              <span className="block text-sm font-bold text-ink-900">{preset.label}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{preset.hint}</span>
            </Link>
          );
        })}
        <CustomCompareToggle
          path={path}
          view={view}
          period={period}
          compare={compare}
          selected={active === "custom"}
        />
      </div>
    </div>
  );
}

function CustomCompareToggle({
  path,
  view,
  period,
  compare,
  selected,
}: {
  path: string;
  view: FinanceView;
  period: FinancePeriod;
  compare: FinancePeriod | null;
  selected: boolean;
}) {
  const fallback = comparePresets(period)[0]?.period ?? period;

  return (
    <details
      open={selected}
      className={cn(
        "rounded-2xl border px-4 py-3 sm:col-span-2 lg:col-span-1",
        selected
          ? "border-brand-500 bg-white shadow-sm ring-2 ring-brand-200"
          : "border-transparent bg-white/70"
      )}
    >
      <summary className="cursor-pointer list-none text-sm font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
        תאריך אחר
        <span className="mt-0.5 block text-xs font-medium text-ink-500">
          בחירת חודש, שנה או טווח ידנית
        </span>
      </summary>
      <form method="get" action={path} className="mt-3 space-y-3">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="compare" value="1" />
        {view === "month" && period.month && (
          <input type="hidden" name="month" value={period.month} />
        )}
        {view === "year" && period.year && (
          <input type="hidden" name="year" value={period.year} />
        )}
        {view === "range" && (
          <>
            <input type="hidden" name="from" value={period.start} />
            <input type="hidden" name="to" value={period.end} />
          </>
        )}

        {view === "month" && (
          <Field label="חודש להשוואה" htmlFor="compareMonth">
            <Input
              id="compareMonth"
              type="month"
              name="cMonth"
              defaultValue={compare?.month ?? fallback.month}
              required
            />
          </Field>
        )}
        {view === "year" && (
          <Field label="שנה להשוואה" htmlFor="compareYear">
            <Select
              id="compareYear"
              name="cYear"
              defaultValue={String(compare?.year ?? (period.year ?? 0) - 1)}
              required
            >
              {yearOptions(period.year ?? new Date().getFullYear()).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {view === "range" && (
          <div className="grid gap-3">
            <Field label="מתאריך" htmlFor="compareFrom">
              <Input
                id="compareFrom"
                type="date"
                name="cFrom"
                defaultValue={compare?.start ?? fallback.start}
                required
              />
            </Field>
            <Field label="עד תאריך" htmlFor="compareTo">
              <Input
                id="compareTo"
                type="date"
                name="cTo"
                defaultValue={compare?.end ?? fallback.end}
                required
              />
            </Field>
          </div>
        )}
        <Button type="submit" size="sm" className="w-full">
          השוואה לתאריך הזה
        </Button>
      </form>
    </details>
  );
}

function yearOptions(around: number) {
  return Array.from({ length: 8 }, (_, index) => around - 4 + index);
}

function NavArrow({
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
      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-white hover:text-ink-800"
    >
      {children}
    </Link>
  );
}
