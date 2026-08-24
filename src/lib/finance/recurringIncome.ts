export const MATNAS_INCOME_SOURCE = "matnas";

export type RecurringIncomeEntry = {
  month: string;
  amount: number;
};

/** הסכום שחל בחודש: הרשומה האחרונה שחודשה קטן או שווה לחודש המבוקש. */
export function recurringAmountForMonth(
  entries: RecurringIncomeEntry[],
  month: string
): number {
  let amount = 0;
  let latestMonth = "";

  for (const entry of entries) {
    if (entry.month <= month && entry.month >= latestMonth) {
      latestMonth = entry.month;
      amount = entry.amount;
    }
  }

  return amount;
}

export function recurringAmountByMonth(
  entries: RecurringIncomeEntry[],
  months: string[]
): Map<string, number> {
  return new Map(
    months.map((month) => [month, recurringAmountForMonth(entries, month)])
  );
}

export function hasOwnRecurringEntry(
  entries: RecurringIncomeEntry[],
  month: string
): boolean {
  return entries.some((entry) => entry.month === month);
}
