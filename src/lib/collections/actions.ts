"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import {
  DEFERRED_PAYMENT_METHODS,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type CollectionActionResult =
  | { success: true }
  | { success: false; error: string };

const NOT_ALLOWED: CollectionActionResult = {
  success: false,
  error: "אין לך הרשאה לבצע פעולה זו.",
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAmount(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return round2(n);
}

async function requireAdminProfile() {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") return null;
  return profile;
}

type ChargeRow = {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_receipts: { amount: number }[] | null;
};

function remainingOf(charge: ChargeRow) {
  const paid = (charge.payment_receipts ?? []).reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  return round2(Math.max(0, Number(charge.amount) - paid));
}

async function loadDeferredCharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
): Promise<{ charge: ChargeRow } | { error: string }> {
  const { data: charge } = await supabase
    .from("payments")
    .select("id, amount, payment_method, payment_receipts(amount)")
    .eq("id", paymentId)
    .maybeSingle();

  if (!charge) {
    return { error: "החיוב לא נמצא." };
  }
  if (!isDeferredPaymentMethod(charge.payment_method)) {
    return { error: "חיוב זה אינו מנוהל דרך רשימת הגבייה." };
  }

  return { charge: charge as ChargeRow };
}

/**
 * רושם תקבול חלקי או מלא מול חיוב בגבייה.
 * הסטטוס של החיוב וההרשמה מתעדכן בטריגר לפי סכום התקבולים.
 */
export async function addPaymentReceipt(input: {
  paymentId: string;
  amount: number;
  receivedAt?: string | null;
  note?: string | null;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום תקבול חיובי." };
  }

  const supabase = await createClient();
  const loaded = await loadDeferredCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const remaining = remainingOf(loaded.charge);
  if (remaining <= 0) {
    return { success: false, error: "החיוב כבר שולם במלואו." };
  }
  if (amount > remaining) {
    return {
      success: false,
      error: `לא ניתן לרשום יותר מהיתרה (${remaining.toFixed(2)} ₪).`,
    };
  }

  const receivedAt = input.receivedAt?.trim()
    ? new Date(input.receivedAt).toISOString()
    : new Date().toISOString();

  if (Number.isNaN(Date.parse(receivedAt))) {
    return { success: false, error: "תאריך התקבול אינו תקין." };
  }

  const note = input.note?.trim() || null;

  const { error } = await supabase.from("payment_receipts").insert({
    payment_id: loaded.charge.id,
    amount,
    received_at: receivedAt,
    note,
    created_by: profile.id,
  });

  if (error) {
    if (error.message.includes("סכום התקבולים")) {
      return {
        success: false,
        error: "סכום התקבולים חורג מסכום החיוב. רעננו ונסו שוב.",
      };
    }
    return { success: false, error: "רישום התקבול נכשל. נסו שוב." };
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/** מוחק תקבול בודד — היתרה והסטטוס מחושבים מחדש בטריגר. */
export async function deletePaymentReceipt(input: {
  receiptId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: receipt } = await supabase
    .from("payment_receipts")
    .select("id, payment_id, payments(payment_method)")
    .eq("id", input.receiptId)
    .maybeSingle();

  if (!receipt) {
    return { success: false, error: "התקבול לא נמצא." };
  }

  const method = receipt.payments?.payment_method ?? null;
  if (!isDeferredPaymentMethod(method)) {
    return { success: false, error: "תקבול זה אינו מנוהל דרך רשימת הגבייה." };
  }

  const { error } = await supabase
    .from("payment_receipts")
    .delete()
    .eq("id", receipt.id);

  if (error) {
    return { success: false, error: "מחיקת התקבול נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/** סוגר את כל היתרה הנותרת של חיוב בתקבול אחד. */
export async function settleChargeRemaining(input: {
  paymentId: string;
  receivedAt?: string | null;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadDeferredCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const remaining = remainingOf(loaded.charge);
  if (remaining <= 0) {
    return { success: false, error: "החיוב כבר שולם במלואו." };
  }

  return addPaymentReceipt({
    paymentId: input.paymentId,
    amount: remaining,
    receivedAt: input.receivedAt,
    note: "סגירת יתרה",
  });
}

/** סוגר את כל היתרות הפתוחות של הורה — תקבול אחד לכל חיוב עם יתרה. */
export async function settleParentCharges(input: {
  parentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: charges } = await supabase
    .from("payments")
    .select("id, amount, payment_method, payment_receipts(amount)")
    .eq("parent_id", input.parentId)
    .in("status", ["pending", "partial"])
    .in("payment_method", [...DEFERRED_PAYMENT_METHODS]);

  const open = (charges ?? []).filter(
    (charge) => remainingOf(charge as ChargeRow) > 0
  );

  if (open.length === 0) {
    return { success: false, error: "אין חובות פתוחים להורה זה." };
  }

  const receivedAt = new Date().toISOString();
  const rows = open.map((charge) => ({
    payment_id: charge.id,
    amount: remainingOf(charge as ChargeRow),
    received_at: receivedAt,
    note: "סגירת יתרה",
    created_by: profile.id,
  }));

  const { error } = await supabase.from("payment_receipts").insert(rows);

  if (error) {
    return { success: false, error: "סגירת החובות נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/collections");
  return { success: true };
}
