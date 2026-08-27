"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import {
  DEFERRED_PAYMENT_METHODS,
  PAYMENT_METHOD,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import { subjectLabel } from "@/lib/finance/subject";
import {
  createStandaloneDocument,
  isCardcomConfigured,
} from "@/lib/integrations/cardcom";
import { resolveReceiptLabelForCheckout } from "@/lib/enrollment/receiptLabel";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
import { loadCustomer } from "@/lib/payments/cardcomCheckout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

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
  parent_id: string;
  payment_method: Enums<"payment_method"> | null;
  receipt_description: string | null;
  enrollments: {
    type: Enums<"enrollment_type">;
    children: { full_name: string } | null;
    classes: { title: string } | null;
    programs: { title: string } | null;
    pool_passes: { title: string } | null;
    private_lessons: { title: string } | null;
  } | null;
  payment_receipts: { amount: number }[] | null;
};

const CHARGE_SELECT =
  "id, amount, parent_id, payment_method, receipt_description, enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(amount)";

function remainingOf(charge: ChargeRow) {
  const paid = (charge.payment_receipts ?? []).reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  return round2(Math.max(0, Number(charge.amount) - paid));
}

function chargeProduct(charge: ChargeRow) {
  return (
    charge.receipt_description?.trim() ||
    subjectLabel(charge.enrollments) ||
    "גבייה"
  );
}

async function loadDeferredCharge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
): Promise<{ charge: ChargeRow } | { error: string }> {
  const { data: charge } = await supabase
    .from("payments")
    .select(CHARGE_SELECT)
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

async function issueCollectionDocument(input: {
  charge: ChargeRow;
  amount: number;
  receivedAt: string;
  note: string | null;
}) {
  if (!isCardcomConfigured()) {
    throw new Error("קארדקום אינו מוגדר — לא ניתן להפיק חשבונית.");
  }

  const customer = await loadCustomer(input.charge.parent_id);
  const method = input.charge.payment_method;
  const methodLabel = method ? PAYMENT_METHOD[method] : "תשלום";
  const documentDate = input.receivedAt.slice(0, 10);

  return createStandaloneDocument({
    amount: input.amount,
    description: chargeProduct(input.charge),
    customer,
    paymentMethodLabel: methodLabel,
    asCash: method === "cash",
    comment: input.note,
    documentDate,
  });
}

async function notifyCollectionPaid(input: {
  charge: ChargeRow;
  amount: number;
}) {
  const customer = await loadCustomer(input.charge.parent_id);
  const childName = input.charge.enrollments?.children?.full_name;

  await notifyAdminPayment({
    paid: true,
    parentName: customer.name,
    phone: customer.phone,
    email: customer.email,
    product: chargeProduct(input.charge),
    amount: input.amount,
    paymentMethod: input.charge.payment_method,
    participants: childName ? [childName] : undefined,
  });
}

async function recordCollectionReceipt(input: {
  charge: ChargeRow;
  amount: number;
  receivedAt: string;
  note: string | null;
  createdBy: string;
}): Promise<CollectionActionResult> {
  let document: Awaited<ReturnType<typeof issueCollectionDocument>>;
  try {
    document = await issueCollectionDocument(input);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "הפקת החשבונית בקארדקום נכשלה. התקבול לא נרשם.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payment_receipts").insert({
    payment_id: input.charge.id,
    amount: input.amount,
    received_at: input.receivedAt,
    note: input.note,
    created_by: input.createdBy,
  });

  if (error) {
    if (error.message.includes("סכום התקבולים")) {
      return {
        success: false,
        error: "סכום התקבולים חורג מסכום החיוב. רעננו ונסו שוב.",
      };
    }
    return {
      success: false,
      error: document.documentNumber
        ? `החשבונית הופקה בקארדקום (מס׳ ${document.documentNumber}) אך רישום התקבול נכשל.`
        : "רישום התקבול נכשל. נסו שוב.",
    };
  }

  const admin = createAdminClient();
  await admin.from("receipts").insert({
    parent_id: input.charge.parent_id,
    payment_id: input.charge.id,
    receipt_number: document.documentNumber,
    receipt_url: document.documentUrl,
    sent_to_email: document.sentToEmail,
  });

  try {
    await notifyCollectionPaid({
      charge: input.charge,
      amount: input.amount,
    });
  } catch (error) {
    console.error("[admin-payment-email] collection notify failed", error);
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/**
 * רושם תקבול חלקי או מלא מול חיוב בגבייה.
 * מפיק חשבונית מס-קבלה בקארדקום ושולח למייל הלקוח, ומייל למנהל.
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

  return recordCollectionReceipt({
    charge: loaded.charge,
    amount,
    receivedAt,
    note: input.note?.trim() || null,
    createdBy: profile.id,
  });
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

/** סוגר את כל היתרות הפתוחות של הורה — תקבול ומסמך לכל חיוב עם יתרה. */
export async function settleParentCharges(input: {
  parentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: charges } = await supabase
    .from("payments")
    .select(CHARGE_SELECT)
    .eq("parent_id", input.parentId)
    .in("status", ["pending", "partial"])
    .in("payment_method", [...DEFERRED_PAYMENT_METHODS]);

  const open = (charges ?? []).filter(
    (charge) => remainingOf(charge as ChargeRow) > 0
  ) as ChargeRow[];

  if (open.length === 0) {
    return { success: false, error: "אין חובות פתוחים להורה זה." };
  }

  const receivedAt = new Date().toISOString();

  for (const charge of open) {
    const result = await recordCollectionReceipt({
      charge,
      amount: remainingOf(charge),
      receivedAt,
      note: "סגירת יתרה",
      createdBy: profile.id,
    });
    if (!result.success) return result;
  }

  return { success: true };
}

/** מעדכן את תווית הקבלה של חיוב — הטקסט יופיע בחשבונית קארדקום. */
export async function updatePaymentReceiptLabel(input: {
  paymentId: string;
  receiptLabelId: string | null;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadDeferredCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const resolved = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

  const { error } = await supabase
    .from("payments")
    .update({
      receipt_label_id: resolved.labelId,
      receipt_description: resolved.description,
    })
    .eq("id", input.paymentId);

  if (error) {
    return { success: false, error: "עדכון תווית הקבלה נכשל. נסו שוב." };
  }

  revalidatePath("/admin/collections");
  return { success: true };
}
