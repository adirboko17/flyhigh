import {
  hasOwnRecurringEntry,
  recurringAmountForMonth,
  type RecurringIncomeEntry,
} from "@/lib/finance/recurringIncome";

export type ManualExpenseMode = "recurring" | "month";

export type ManualExpenseSource = {
  id: string;
  name: string;
  mode: ManualExpenseMode;
};

export type ManualExpenseEntry = {
  sourceId: string;
  month: string;
  amount: number;
};

export type ManualExpenseView = {
  id: string;
  name: string;
  mode: ManualExpenseMode;
  amount: number;
  isOwnEntry: boolean;
  definedLater: boolean;
};

export function asManualExpenseMode(value: string): ManualExpenseMode {
  return value === "month" ? "month" : "recurring";
}

function entriesForSource(
  source: Pick<ManualExpenseSource, "id">,
  entries: ManualExpenseEntry[]
): RecurringIncomeEntry[] {
  return entries
    .filter((entry) => entry.sourceId === source.id)
    .map((entry) => ({ month: entry.month, amount: entry.amount }));
}

export function expenseAmountForMonth(
  source: Pick<ManualExpenseSource, "id" | "mode">,
  entries: ManualExpenseEntry[],
  month: string
): number {
  const own = entriesForSource(source, entries);
  if (source.mode === "month") {
    return own.find((entry) => entry.month === month)?.amount ?? 0;
  }
  return recurringAmountForMonth(own, month);
}

function sourceAppliesToMonth(
  source: Pick<ManualExpenseSource, "id" | "mode">,
  entries: ManualExpenseEntry[],
  month: string
): boolean {
  if (source.mode === "recurring") return true;
  return entries.some((entry) => entry.sourceId === source.id && entry.month === month);
}

export function expenseViewsForMonth(
  sources: ManualExpenseSource[],
  entries: ManualExpenseEntry[],
  month: string
): ManualExpenseView[] {
  return sources
    .filter((source) => sourceAppliesToMonth(source, entries, month))
    .map((source) => {
      const own = entriesForSource(source, entries);
      const amount = expenseAmountForMonth(source, entries, month);
      return {
        id: source.id,
        name: source.name,
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
