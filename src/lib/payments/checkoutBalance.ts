import { createAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/types/database.types";

export type BalanceHold = {
  applied: number;
  entryId: string | null;
};

export type CheckoutPaymentRow = {
  parent_id: string;
  enrollment_id: string;
  amount: number;
  payment_method: Enums<"payment_method">;
  status: "pending" | "paid";
  paid_at: string | null;
  receipt_label_id: string | null;
  receipt_description: string | null;
  office_collection: boolean;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** מחלק יתרה בין שורות חיוב. הסכום שנשמר בכל שורה נשאר המחיר שלה. */
export function allocateBalance(
  amounts: number[],
  balance: number
): { balance: number; cash: number }[] {
  const clean = amounts.map((amount) => roundMoney(Math.max(amount, 0)));
  const total = roundMoney(clean.reduce((sum, amount) => sum + amount, 0));
  const applied = roundMoney(Math.min(Math.max(balance, 0), total));
  let left = applied;

  const portions = clean.map((amount, index) => {
    const isLast = index === clean.length - 1;
    const share = isLast
      ? left
      : total <= 0
        ? 0
        : roundMoney(Math.min(amount, (amount / total) * applied));
    const used = roundMoney(
      Math.min(amount, Math.max(0, isLast ? left : Math.min(share, left)))
    );
    left = roundMoney(left - used);
    return { balance: used, cash: roundMoney(amount - used) };
  });

  if (left > 0) {
    for (let index = portions.length - 1; index >= 0 && left > 0; index -= 1) {
      const extra = roundMoney(Math.min(portions[index].cash, left));
      if (extra <= 0) continue;
      portions[index] = {
        balance: roundMoney(portions[index].balance + extra),
        cash: roundMoney(portions[index].cash - extra),
      };
      left = roundMoney(left - extra);
    }
  }

  return portions;
}

export function enrollmentPaymentStatusForBalance(input: {
  cashDue: number;
  balanceApplied: number;
}): "paid" | "partial" | "unpaid" {
  if (input.cashDue <= 0) return "paid";
  if (input.balanceApplied > 0) return "partial";
  return "unpaid";
}

export function buildCheckoutPaymentRows(input: {
  lines: { enrollmentId: string; amount: number }[];
  balanceApplied: number;
  parentId: string;
  paymentMethod: Enums<"payment_method">;
  deferred: boolean;
  awaitingCardcom: boolean;
  paidAt: string;
  receiptLabelId: string | null;
  receiptDescription: string | null;
}): { rows: CheckoutPaymentRow[]; cashDue: number; balanceUsed: number } {
  const portions = allocateBalance(
    input.lines.map((line) => line.amount),
    input.balanceApplied
  );
  const rows: CheckoutPaymentRow[] = [];

  input.lines.forEach((line, index) => {
    const portion = portions[index] ?? { balance: 0, cash: line.amount };
    if (portion.balance > 0) {
      rows.push({
        parent_id: input.parentId,
        enrollment_id: line.enrollmentId,
        amount: portion.balance,
        payment_method: "customer_balance",
        status: "paid",
        paid_at: input.paidAt,
        receipt_label_id: input.receiptLabelId,
        receipt_description: input.receiptDescription,
        office_collection: false,
      });
    }
    const cashOpen = input.deferred || input.awaitingCardcom;
    if (portion.cash > 0 || portion.balance <= 0) {
      rows.push({
        parent_id: input.parentId,
        enrollment_id: line.enrollmentId,
        amount: portion.cash,
        payment_method: input.paymentMethod,
        status: cashOpen && portion.cash > 0 ? "pending" : "paid",
        paid_at: cashOpen && portion.cash > 0 ? null : input.paidAt,
        receipt_label_id: input.receiptLabelId,
        receipt_description: input.receiptDescription,
        office_collection: input.deferred && portion.cash > 0,
      });
    }
  });

  const cashDue = roundMoney(
    rows
      .filter((row) => row.payment_method !== "customer_balance")
      .reduce((sum, row) => sum + row.amount, 0)
  );
  const balanceUsed = roundMoney(
    rows
      .filter((row) => row.payment_method === "customer_balance")
      .reduce((sum, row) => sum + row.amount, 0)
  );
  return { rows, cashDue, balanceUsed };
}

async function spendBalance(
  parentId: string,
  amount: number,
  note: string
): Promise<BalanceHold> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("spend_customer_balance", {
    p_parent_id: parentId,
    p_amount: amount,
    p_note: note,
  });
  if (error) {
    throw new Error("לא הצלחנו להשתמש ביתרה. נסו שוב.");
  }
  const row = data?.[0];
  const applied = roundMoney(Number(row?.applied ?? 0));
  return {
    applied,
    entryId: applied > 0 ? (row?.entry_id ?? null) : null,
  };
}

export async function getCustomerBalance(parentId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customer_balance_entries")
    .select("amount")
    .eq("parent_id", parentId);
  if (error) return 0;
  return roundMoney(
    (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0)
  );
}

export async function reserveCheckoutBalance(input: {
  parentId: string;
  total: number;
  useBalance?: boolean;
  note: string;
}): Promise<BalanceHold> {
  const total = roundMoney(Math.max(input.total, 0));
  if (input.useBalance === false || total <= 0) {
    return { applied: 0, entryId: null };
  }
  return spendBalance(input.parentId, total, input.note);
}

export async function releaseCheckoutBalance(entryId: string | null) {
  if (!entryId) return;
  const admin = createAdminClient();
  await admin.rpc("restore_customer_balance_entry", { p_entry_id: entryId });
}

export async function attachBalanceCheckout(
  entryId: string | null,
  checkoutId: string | null
) {
  if (!entryId || !checkoutId) return;
  const admin = createAdminClient();
  await admin
    .from("customer_balance_entries")
    .update({ checkout_id: checkoutId })
    .eq("id", entryId);
}

export async function releaseBalanceForCheckout(checkoutId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("restore_customer_balance_checkout", {
    p_checkout_id: checkoutId,
  });
  if (error) return 0;
  return roundMoney(Number(data ?? 0));
}

export async function restoreCustomerBalancePayments(paymentIds: string[]) {
  if (paymentIds.length === 0) return;
  const admin = createAdminClient();
  for (const paymentId of paymentIds) {
    await admin.rpc("restore_customer_balance_payment", {
      p_payment_id: paymentId,
    });
  }
}

export async function grantedAmountsByPayment(
  paymentIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (paymentIds.length === 0) return totals;
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_balance_entries")
    .select("source_payment_id, amount")
    .eq("kind", "grant")
    .in("source_payment_id", paymentIds);
  for (const row of data ?? []) {
    if (!row.source_payment_id) continue;
    totals.set(
      row.source_payment_id,
      roundMoney((totals.get(row.source_payment_id) ?? 0) + Number(row.amount))
    );
  }
  return totals;
}

export async function grantCustomerBalance(input: {
  parentId: string;
  amount: number;
  note: string | null;
  createdBy: string;
  sourcePaymentId: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_customer_balance", {
    p_parent_id: input.parentId,
    p_amount: input.amount,
    p_note: input.note ?? "",
    p_created_by: input.createdBy,
    p_source_payment_id: input.sourcePaymentId,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("יותר מהסכום") || message.includes("סכום חיובי")) {
      throw new Error(message);
    }
    throw new Error("העברה ליתרה נכשלה. נסו שוב.");
  }
  return data;
}
