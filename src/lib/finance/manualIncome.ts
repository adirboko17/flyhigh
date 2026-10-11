import {
  MATNAS_INCOME_SOURCE,
  hasOwnRecurringEntry,
  recurringAmountForMonth,
  type RecurringIncomeEntry,
} from "@/lib/finance/recurringIncome";

/** מזהה ההכנסה הקבועה מהמתנ״ס, כדי שרשומות ישנות ב-source ימשיכו להיספר. */
export const MATNAS_INCOME_SLUG = MATNAS_INCOME_SOURCE;

export type ManualIncomeMode = "recurring" | "month";

export type ManualIncomeSource = {
  id: string;
  name: string;
  category: string;
  mode: ManualIncomeMode;
  slug: string | null;
};

export type ManualIncomeEntry = {
  sourceId: string;
  month: string;
  amount: number;
};

export type ManualIncomeView = {
  id: string;
  name: string;
  category: string;
  mode: ManualIncomeMode;
  amount: number;
  isOwnEntry: boolean;
  definedLater: boolean;
};

export function asManualIncomeMode(value: string): ManualIncomeMode {
  return value === "month" ? "month" : "recurring";
}

export function entriesForSource(
  source: Pick<ManualIncomeSource, "id">,
  entries: ManualIncomeEntry[]
): RecurringIncomeEntry[] {
  return entries
    .filter((entry) => entry.sourceId === source.id)
    .map((entry) => ({ month: entry.month, amount: entry.amount }));
}

export function manualAmountForMonth(
  source: Pick<ManualIncomeSource, "id" | "mode">,
  entries: ManualIncomeEntry[],
  month: string
): number {
  const own = entriesForSource(source, entries);
  if (source.mode === "month") {
    return own.find((entry) => entry.month === month)?.amount ?? 0;
  }
  return recurringAmountForMonth(own, month);
}

/** חודש בודד מופיע רק באותו חודש. סכום קבוע זמין בכל חודש, גם לפני החודש הראשון שהוגדר. */
export function sourceAppliesToMonth(
  source: Pick<ManualIncomeSource, "id" | "mode">,
  entries: ManualIncomeEntry[],
  month: string
): boolean {
  if (source.mode === "recurring") return true;
  return entries.some((entry) => entry.sourceId === source.id && entry.month === month);
}

export function manualViewsForMonth(
  sources: ManualIncomeSource[],
  entries: ManualIncomeEntry[],
  month: string
): ManualIncomeView[] {
  return sources
    .filter((source) => sourceAppliesToMonth(source, entries, month))
    .map((source) => {
      const own = entriesForSource(source, entries);
      const amount = manualAmountForMonth(source, entries, month);
      return {
        id: source.id,
        name: source.name,
        category: source.category,
        mode: source.mode,
        amount,
        isOwnEntry: hasOwnRecurringEntry(own, month),
        definedLater:
          source.mode === "recurring" &&
          amount === 0 &&
          own.some((entry) => entry.month > month),
      };
    });
}

/** מחבר שורות סכום למקור, כולל source ישן של המתנ״ס. שורה לפי מזהה גוברת על slug. */
export function linkIncomeEntries(
  sources: ManualIncomeSource[],
  rows: { source: string; month: string; amount: number }[]
): ManualIncomeEntry[] {
  const idByKey = new Map<string, string>();
  for (const source of sources) {
    idByKey.set(source.id, source.id);
    if (source.slug) idByKey.set(source.slug, source.id);
  }

  const bySourceMonth = new Map<string, ManualIncomeEntry>();
  for (const row of rows) {
    const sourceId = idByKey.get(row.source);
    if (!sourceId) continue;
    const key = `${sourceId}:${row.month}`;
    const next: ManualIncomeEntry = {
      sourceId,
      month: row.month,
      amount: Number(row.amount),
    };
    const existing = bySourceMonth.get(key);
    if (!existing || row.source === sourceId) bySourceMonth.set(key, next);
  }

  return [...bySourceMonth.values()];
}
