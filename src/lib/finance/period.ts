import {
  dateRangeLabel,
  isValidIsoDate,
  monthLabel,
  monthOf,
  monthRange,
  parseDateParam,
  parseMonthParam,
  parseYearParam,
  precedingRange,
  addMonths,
  shiftMonth,
  todayInIsrael,
  yearLabel,
  yearRange,
} from "@/lib/scheduling/monthGrid";

export type FinanceView = "month" | "year" | "range";

export type FinancePeriod = {
  view: FinanceView;
  start: string;
  end: string;
  label: string;
  month?: string;
  year?: number;
};

export type FinanceSearchParams = {
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
};

export type FinanceQueryState = {
  view: FinanceView;
  period: FinancePeriod;
  compare: FinancePeriod | null;
  today: string;
  currentMonth: string;
  currentYear: number;
};

function parseView(value: string | undefined): FinanceView {
  if (value === "year" || value === "range") return value;
  return "month";
}

function monthPeriod(month: string): FinancePeriod {
  const { start, end } = monthRange(month);
  return {
    view: "month",
    start,
    end,
    label: monthLabel(month),
    month,
    year: Number(month.slice(0, 4)),
  };
}

function yearPeriod(year: number): FinancePeriod {
  const { start, end } = yearRange(year);
  return {
    view: "year",
    start,
    end,
    label: yearLabel(year),
    year,
  };
}

function rangePeriod(start: string, end: string): FinancePeriod {
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  return {
    view: "range",
    start: from,
    end: to,
    label: dateRangeLabel(from, to),
  };
}

export function defaultComparePeriod(period: FinancePeriod): FinancePeriod {
  if (period.view === "month" && period.month) {
    return monthPeriod(shiftMonth(period.month, -12));
  }
  if (period.view === "year" && period.year) {
    return yearPeriod(period.year - 1);
  }
  const previous = precedingRange(period.start, period.end);
  return rangePeriod(previous.start, previous.end);
}

function monthsBetween(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return toYear * 12 + toMonth - (fromYear * 12 + fromMonth);
}

/** כשמזיזים את התקופה הנבחרת, שומרים על אותו מרווח מול תקופת ההשוואה. */
export function shiftCompareWithPeriod(
  period: FinancePeriod,
  compare: FinancePeriod | null,
  nextPeriod: FinancePeriod
): FinancePeriod {
  if (!compare) return defaultComparePeriod(nextPeriod);

  if (
    period.view === "month" &&
    nextPeriod.view === "month" &&
    period.month &&
    nextPeriod.month &&
    compare.month
  ) {
    return monthPeriod(
      shiftMonth(compare.month, monthsBetween(period.month, nextPeriod.month))
    );
  }

  if (
    period.view === "year" &&
    nextPeriod.view === "year" &&
    period.year != null &&
    nextPeriod.year != null &&
    compare.year != null
  ) {
    return yearPeriod(compare.year + (nextPeriod.year - period.year));
  }

  return defaultComparePeriod(nextPeriod);
}

export type ComparePresetId = "previous" | "lastYear" | "custom";

export type ComparePreset = {
  id: Exclude<ComparePresetId, "custom">;
  label: string;
  hint: string;
  period: FinancePeriod;
};

export function comparePresets(period: FinancePeriod): ComparePreset[] {
  if (period.view === "month" && period.month) {
    const lastYear = shiftMonth(period.month, -12);
    const previous = shiftMonth(period.month, -1);
    return [
      {
        id: "lastYear",
        label: "אותו חודש אשתקד",
        hint: monthLabel(lastYear),
        period: monthPeriod(lastYear),
      },
      {
        id: "previous",
        label: "החודש הקודם",
        hint: monthLabel(previous),
        period: monthPeriod(previous),
      },
    ];
  }
  if (period.view === "year" && period.year) {
    return [
      {
        id: "previous",
        label: "השנה הקודמת",
        hint: yearLabel(period.year - 1),
        period: yearPeriod(period.year - 1),
      },
    ];
  }
  const previous = precedingRange(period.start, period.end);
  const lastYear = rangePeriod(addMonths(period.start, -12), addMonths(period.end, -12));
  return [
    {
      id: "previous",
      label: "התקופה הקודמת",
      hint: dateRangeLabel(previous.start, previous.end),
      period: rangePeriod(previous.start, previous.end),
    },
    {
      id: "lastYear",
      label: "אותו טווח אשתקד",
      hint: lastYear.label,
      period: lastYear,
    },
  ];
}

export function activeComparePreset(
  period: FinancePeriod,
  compare: FinancePeriod | null
): ComparePresetId | null {
  if (!compare) return null;
  const match = comparePresets(period).find(
    (preset) => preset.period.start === compare.start && preset.period.end === compare.end
  );
  return match?.id ?? "custom";
}

export function parseFinanceState(
  params: FinanceSearchParams,
  today = todayInIsrael()
): FinanceQueryState {
  const currentMonth = monthOf(today);
  const currentYear = Number(today.slice(0, 4));
  const view = parseView(params.view);

  let period: FinancePeriod;
  if (view === "year") {
    period = yearPeriod(parseYearParam(params.year, currentYear));
  } else if (view === "range") {
    const fallbackStart = monthRange(currentMonth).start;
    period = rangePeriod(
      parseDateParam(params.from, fallbackStart),
      parseDateParam(params.to, today)
    );
  } else {
    period = monthPeriod(parseMonthParam(params.month, currentMonth));
  }

  const compareOn = params.compare === "1" || params.compare === "true";
  let compare: FinancePeriod | null = null;
  if (compareOn) {
    if (period.view === "month") {
      compare = monthPeriod(
        parseMonthParam(params.cMonth, defaultComparePeriod(period).month!)
      );
    } else if (period.view === "year") {
      compare = yearPeriod(
        parseYearParam(params.cYear, (period.year ?? currentYear) - 1)
      );
    } else {
      const fallback = defaultComparePeriod(period);
      const cFrom = params.cFrom && isValidIsoDate(params.cFrom) ? params.cFrom : fallback.start;
      const cTo = params.cTo && isValidIsoDate(params.cTo) ? params.cTo : fallback.end;
      compare = rangePeriod(cFrom, cTo);
    }
  }

  return { view, period, compare, today, currentMonth, currentYear };
}

export function financeQuery(state: {
  view: FinanceView;
  period: FinancePeriod;
  compare?: FinancePeriod | null;
}): string {
  const params = new URLSearchParams();
  if (state.view !== "month") params.set("view", state.view);
  if (state.view === "month" && state.period.month) {
    params.set("month", state.period.month);
  }
  if (state.view === "year" && state.period.year) {
    params.set("year", String(state.period.year));
  }
  if (state.view === "range") {
    params.set("from", state.period.start);
    params.set("to", state.period.end);
  }
  if (state.compare) {
    params.set("compare", "1");
    if (state.compare.view === "month" && state.compare.month) {
      params.set("cMonth", state.compare.month);
    }
    if (state.compare.view === "year" && state.compare.year) {
      params.set("cYear", String(state.compare.year));
    }
    if (state.compare.view === "range") {
      params.set("cFrom", state.compare.start);
      params.set("cTo", state.compare.end);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const FINANCE_PATH = "/admin/finance";
export const REPORTS_PATH = "/admin/reports";

export function financeHref(
  state: {
    view: FinanceView;
    period: FinancePeriod;
    compare?: FinancePeriod | null;
  },
  path = REPORTS_PATH
): string {
  return `${path}${financeQuery(state)}`;
}

export function periodDelta(
  current: number,
  previous: number
): {
  amount: number;
  percent: number | null;
  label: string;
  direction: "up" | "down" | "flat";
} {
  const amount = Math.round((current - previous) * 100) / 100;
  const direction = amount > 0 ? "up" : amount < 0 ? "down" : "flat";
  if (previous === 0) {
    return {
      amount,
      percent: current === 0 ? 0 : null,
      label: current === 0 ? "ללא שינוי" : "אין נתוני בסיס",
      direction,
    };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) {
    return { amount, percent, label: "ללא שינוי", direction: "flat" };
  }
  return {
    amount,
    percent,
    label: `${percent > 0 ? "▲" : "▼"} ${Math.abs(percent)}%`,
    direction,
  };
}

/** עלייה בהכנסות/רווח היא חיובית; עלייה בשכר היא הוצאה. */
export function deltaIsFavorable(direction: "up" | "down" | "flat", invert = false) {
  if (direction === "flat") return null;
  const up = direction === "up";
  return invert ? !up : up;
}

export function exportFilename(period: FinancePeriod): string {
  if (period.view === "month" && period.month) return `kesafim-${period.month}`;
  if (period.view === "year" && period.year) return `kesafim-${period.year}`;
  return `kesafim-${period.start}_${period.end}`;
}
