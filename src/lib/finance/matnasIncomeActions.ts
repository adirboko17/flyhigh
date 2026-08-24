"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  MATNAS_INCOME_SOURCE,
  recurringAmountForMonth,
  type RecurringIncomeEntry,
} from "@/lib/finance/recurringIncome";
import { parseMonthParam, shiftMonth } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export async function saveMatnasIncome(input: {
  month: string;
  amount: number;
  thisMonthOnly: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const month = parseMonthParam(input.month, "");
  if (!month) {
    return { success: false, error: "חודש לא תקין." };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: "יש להזין סכום תקין." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error: loadError } = await supabase
    .from("recurring_incomes")
    .select("month, amount")
    .eq("source", MATNAS_INCOME_SOURCE)
    .order("month");

  if (loadError) {
    return { success: false, error: "טעינת הסכום נכשלה. נסו שוב." };
  }

  const entries: RecurringIncomeEntry[] = (rows ?? []).map((row) => ({
    month: row.month,
    amount: Number(row.amount),
  }));

  const { error: upsertError } = await supabase.from("recurring_incomes").upsert(
    {
      source: MATNAS_INCOME_SOURCE,
      month,
      amount,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    },
    { onConflict: "source,month" }
  );

  if (upsertError) {
    return { success: false, error: "שמירת הסכום נכשלה. נסו שוב." };
  }

  if (input.thisMonthOnly) {
    const nextMonth = shiftMonth(month, 1);
    const nextHasOwn = entries.some((entry) => entry.month === nextMonth);
    const nextEffectiveBefore = recurringAmountForMonth(entries, nextMonth);

    if (!nextHasOwn && nextEffectiveBefore > 0) {
      const { error: pinError } = await supabase.from("recurring_incomes").insert({
        source: MATNAS_INCOME_SOURCE,
        month: nextMonth,
        amount: nextEffectiveBefore,
        updated_by: user?.id ?? null,
      });

      if (pinError) {
        return {
          success: false,
          error: "הסכום לחודש זה נשמר, אבל לא ניתן היה לשמור את החודשים הבאים.",
        };
      }
    }
  }

  revalidatePath("/admin/finance");
  return { success: true };
}
