"use server";

import { revalidatePath } from "next/cache";
import { normalizeCategoryName } from "@/lib/admin/classCategories";
import { requireRole } from "@/lib/auth";
import type { ManualIncomeMode } from "@/lib/finance/manualIncome";
import {
  recurringAmountForMonth,
  type RecurringIncomeEntry,
} from "@/lib/finance/recurringIncome";
import { parseMonthParam, shiftMonth } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

const SOURCE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanLabel(
  value: string,
  emptyMessage: string
): { value: string } | { error: string } {
  const trimmed = normalizeCategoryName(value);
  if (!trimmed) return { error: emptyMessage };
  if (trimmed.length > 80) return { error: "הטקסט ארוך מדי (עד 80 תווים)." };
  return { value: trimmed };
}

function cleanAmount(amount: number): { value: number } | { error: string } {
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "יש להזין סכום תקין." };
  }
  return { value: Math.round(amount * 100) / 100 };
}

function cleanMode(mode: string): ManualIncomeMode | null {
  if (mode === "month" || mode === "recurring") return mode;
  return null;
}

async function adminContext() {
  await requireRole("admin");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function revalidateFinance() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/reports");
}

export async function createManualIncome(input: {
  name: string;
  category: string;
  amount: number;
  month: string;
  mode: ManualIncomeMode;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId } = await adminContext();

  const month = parseMonthParam(input.month, "");
  if (!month) return { success: false, error: "חודש לא תקין." };

  const name = cleanLabel(input.name, "יש להזין שם להכנסה.");
  if ("error" in name) return { success: false, error: name.error };

  const category = cleanLabel(input.category, "יש לבחור קטגוריה.");
  if ("error" in category) return { success: false, error: category.error };

  const amount = cleanAmount(input.amount);
  if ("error" in amount) return { success: false, error: amount.error };

  const mode = cleanMode(input.mode);
  if (!mode) {
    return { success: false, error: "יש לבחור אם ההכנסה קבועה או לחודש זה בלבד." };
  }

  const { data: created, error: insertError } = await supabase
    .from("manual_income_sources")
    .insert({
      name: name.value,
      category: category.value,
      mode,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { success: false, error: "שמירת ההכנסה נכשלה. נסו שוב." };
  }

  const { error: amountError } = await supabase.from("recurring_incomes").insert({
    source: created.id,
    month,
    amount: amount.value,
    updated_by: userId,
  });

  if (amountError) {
    await supabase.from("manual_income_sources").delete().eq("id", created.id);
    return { success: false, error: "שמירת הסכום נכשלה. נסו שוב." };
  }

  revalidateFinance();
  return { success: true };
}

export async function updateManualIncome(input: {
  id: string;
  name: string;
  category: string;
  amount: number;
  month: string;
  thisMonthOnly: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase, userId } = await adminContext();

  if (!SOURCE_ID.test(input.id)) {
    return { success: false, error: "ההכנסה לא נמצאה." };
  }

  const month = parseMonthParam(input.month, "");
  if (!month) return { success: false, error: "חודש לא תקין." };

  const name = cleanLabel(input.name, "יש להזין שם להכנסה.");
  if ("error" in name) return { success: false, error: name.error };

  const category = cleanLabel(input.category, "יש לבחור קטגוריה.");
  if ("error" in category) return { success: false, error: category.error };

  const amount = cleanAmount(input.amount);
  if ("error" in amount) return { success: false, error: amount.error };

  const { data: source, error: loadError } = await supabase
    .from("manual_income_sources")
    .select("id, mode, slug")
    .eq("id", input.id)
    .maybeSingle();

  if (loadError || !source) {
    return { success: false, error: "ההכנסה לא נמצאה." };
  }

  const mode = cleanMode(source.mode);
  if (!mode) return { success: false, error: "ההכנסה לא נמצאה." };

  const keys = source.slug ? [source.id, source.slug] : [source.id];
  const { data: rows, error: rowsError } = await supabase
    .from("recurring_incomes")
    .select("month, amount, source")
    .in("source", keys);

  if (rowsError) {
    return { success: false, error: "טעינת הסכום נכשלה. נסו שוב." };
  }

  const entries: RecurringIncomeEntry[] = [];
  const seen = new Set<string>();
  for (const row of rows ?? []) {
    if (seen.has(row.month) && row.source !== source.id) continue;
    if (seen.has(row.month)) {
      const index = entries.findIndex((entry) => entry.month === row.month);
      if (index >= 0) entries[index] = { month: row.month, amount: Number(row.amount) };
      continue;
    }
    seen.add(row.month);
    entries.push({ month: row.month, amount: Number(row.amount) });
  }

  const { error: updateError } = await supabase
    .from("manual_income_sources")
    .update({
      name: name.value,
      category: category.value,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", source.id);

  if (updateError) {
    return { success: false, error: "שמירת ההכנסה נכשלה. נסו שוב." };
  }

  const existing = (rows ?? []).find(
    (row) => row.month === month && (row.source === source.id || row.source === source.slug)
  );
  const amountSource = existing?.source === source.slug ? source.slug : source.id;

  const { error: upsertError } = await supabase.from("recurring_incomes").upsert(
    {
      source: amountSource ?? source.id,
      month,
      amount: amount.value,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: "source,month" }
  );

  if (upsertError) {
    return { success: false, error: "שמירת הסכום נכשלה. נסו שוב." };
  }

  if (mode === "recurring" && input.thisMonthOnly) {
    const nextMonth = shiftMonth(month, 1);
    const nextHasOwn = entries.some((entry) => entry.month === nextMonth);
    const nextEffectiveBefore = recurringAmountForMonth(entries, nextMonth);

    if (!nextHasOwn && nextEffectiveBefore > 0) {
      const { error: pinError } = await supabase.from("recurring_incomes").insert({
        source: source.id,
        month: nextMonth,
        amount: nextEffectiveBefore,
        updated_by: userId,
      });

      if (pinError) {
        return {
          success: false,
          error: "הסכום לחודש זה נשמר, אבל לא ניתן היה לשמור את החודשים הבאים.",
        };
      }
    }
  }

  revalidateFinance();
  return { success: true };
}

export async function deleteManualIncome(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await adminContext();

  if (!SOURCE_ID.test(input.id)) {
    return { success: false, error: "ההכנסה לא נמצאה." };
  }

  const { data: source, error: loadError } = await supabase
    .from("manual_income_sources")
    .select("id, slug")
    .eq("id", input.id)
    .maybeSingle();

  if (loadError || !source) {
    return { success: false, error: "ההכנסה לא נמצאה." };
  }

  const keys = source.slug ? [source.id, source.slug] : [source.id];
  const { error: amountsError } = await supabase
    .from("recurring_incomes")
    .delete()
    .in("source", keys);

  if (amountsError) {
    return { success: false, error: "מחיקת ההכנסה נכשלה. נסו שוב." };
  }

  const { error: deleteError } = await supabase
    .from("manual_income_sources")
    .delete()
    .eq("id", source.id);

  if (deleteError) {
    return { success: false, error: "מחיקת ההכנסה נכשלה. נסו שוב." };
  }

  revalidateFinance();
  return { success: true };
}
