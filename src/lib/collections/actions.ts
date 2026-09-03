"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import {
  OFFICE_RECEIPT_METHODS,
  PAYMENT_METHOD,
  isCollectionPaymentMethod,
  isManualReceiptMethod,
  isReceiptlessChargeSettled,
  isReceiptlessCollectionMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { subjectLabel } from "@/lib/finance/subject";
import {
  createStandaloneDocument,
  isCardcomConfigured,
} from "@/lib/integrations/cardcom";
import { resolveReceiptLabelForCheckout } from "@/lib/enrollment/receiptLabel";
import {
  cancelAdminEnrollment,
  revalidateAfterEnrollmentChange,
} from "@/lib/admin/enrollmentActions";
import { paymentHasRecordedMoney } from "@/lib/payments/recordedMoney";
import { composeReceiptLine } from "@/lib/receipt-labels";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
import { loadCustomer } from "@/lib/payments/cardcomCheckout";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type CollectionActionResult =
  | { success: true; checkoutUrl?: string }
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
  status: Enums<"payment_status">;
  parent_id: string;
  enrollment_id: string | null;
  payment_method: Enums<"payment_method"> | null;
  office_collection: boolean;
  checkout_id: string | null;
  receipt_description: string | null;
  receipt_custom_text: string | null;
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
  "id, amount, status, parent_id, enrollment_id, payment_method, office_collection, checkout_id, receipt_description, receipt_custom_text, enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(amount)";

function remainingOf(charge: ChargeRow) {
  if (isReceiptlessChargeSettled(charge.payment_method, charge.status)) {
    return 0;
  }
  const paid = (charge.payment_receipts ?? []).reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  return round2(Math.max(0, Number(charge.amount) - paid));
}

function chargeProduct(charge: ChargeRow) {
  return composeReceiptLine({
    base: charge.receipt_description,
    customText: charge.receipt_custom_text,
    fallback: subjectLabel(charge.enrollments) || "גבייה",
  });
}

async function loadCollectionCharge(
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
  if (!isCollectionManagedCharge(charge)) {
    return { error: "חיוב זה אינו מנוהל דרך רשימת הגבייה." };
  }

  return { charge: charge as ChargeRow };
}

function isCollectionManagedCharge(charge: {
  payment_method: Enums<"payment_method"> | null;
  office_collection?: boolean | null;
}) {
  if (isManualReceiptMethod(charge.payment_method)) return true;
  if (isReceiptlessCollectionMethod(charge.payment_method)) return true;
  return (
    charge.payment_method === "credit_card" && charge.office_collection === true
  );
}

async function unlinkPendingCheckout(checkoutId: string | null) {
  if (!checkoutId) return;
  const admin = createAdminClient();
  const { data: checkout } = await admin
    .from("payment_checkouts")
    .select("id, status")
    .eq("id", checkoutId)
    .maybeSingle();
  if (!checkout || checkout.status !== "pending") return;

  await admin
    .from("payments")
    .update({ checkout_id: null })
    .eq("checkout_id", checkout.id);

  await admin
    .from("payment_checkouts")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", checkout.id);
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
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  if (loaded.charge.payment_method === "credit_card") {
    return {
      success: false,
      error: "לחיוב באשראי יש לפתוח סליקה בקארדקום, לא לרשום תקבול מזומן.",
    };
  }

  if (isReceiptlessCollectionMethod(loaded.charge.payment_method)) {
    const methodLabel = PAYMENT_METHOD[loaded.charge.payment_method];
    return {
      success: false,
      error: `לחיוב ב${methodLabel} יש לאשר בלי להפיק קבלה.`,
    };
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
    .select("id, payment_id, payments(payment_method, office_collection)")
    .eq("id", input.receiptId)
    .maybeSingle();

  if (!receipt) {
    return { success: false, error: "התקבול לא נמצא." };
  }

  if (!isCollectionManagedCharge(receipt.payments ?? {})) {
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
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
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
    .in("payment_method", [...OFFICE_RECEIPT_METHODS]);

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
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
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

/** טקסט מותאם לחיוב הזה בלבד — לא נוסף לרשימת התוויות. */
export async function updatePaymentReceiptCustomText(input: {
  paymentId: string;
  customText: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const { error } = await supabase
    .from("payments")
    .update({ receipt_custom_text: input.customText.trim() || null })
    .eq("id", input.paymentId);

  if (error) {
    return { success: false, error: "עדכון הטקסט המותאם לקבלה נכשל. נסו שוב." };
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/**
 * מוחק חיוב שנפתח בטעות בגבייה — רק אם לא נרשמו תקבולים ולא הופקה חשבונית.
 * אם יש הרשמה מקושרת, היא מבוטלת גם כן.
 */
export async function deleteCollectionCharge(input: {
  paymentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: charge } = await supabase
    .from("payments")
    .select(
      "id, status, payment_method, office_collection, enrollment_id, external_reference, payment_receipts(id), payment_refunds(id)"
    )
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!charge) {
    return { success: false, error: "החיוב לא נמצא." };
  }
  if (!isCollectionManagedCharge(charge)) {
    return { success: false, error: "חיוב זה אינו מנוהל דרך רשימת הגבייה." };
  }

  const { data: documents } = await supabase
    .from("receipts")
    .select("id")
    .eq("payment_id", charge.id);

  if (
    paymentHasRecordedMoney({
      ...charge,
      documentIds: (documents ?? []).map((row) => row.id),
    })
  ) {
    return {
      success: false,
      error:
        "לא ניתן להסיר חיוב שכבר נרשמו לו תקבולים או הופקה חשבונית. מחקו תקבולים רק אם זו טעות בספרים, או השאירו לתיעוד.",
    };
  }

  if (charge.enrollment_id) {
    return cancelAdminEnrollment(charge.enrollment_id);
  }

  const { error } = await supabase.from("payments").delete().eq("id", charge.id);
  if (error) {
    return { success: false, error: "הסרת החיוב נכשלה. נסו שוב." };
  }

  await revalidateAfterEnrollmentChange();
  return { success: true };
}

/** מעדכן את אמצעי התשלום של חיוב פתוח בגבייה. */
export async function updateCollectionPaymentMethod(input: {
  paymentId: string;
  method: CollectionPaymentMethod;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  if (!isCollectionPaymentMethod(input.method)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו תקין." };
  }

  if (input.method === "credit_card" && !isCardcomConfigured()) {
    return {
      success: false,
      error: "קארדקום אינו מוגדר — לא ניתן לעבור לתשלום באשראי.",
    };
  }

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  if (remainingOf(loaded.charge) <= 0) {
    return { success: false, error: "לא ניתן לשנות אמצעי תשלום לחיוב שכבר שולם." };
  }

  if (
    isReceiptlessCollectionMethod(input.method) &&
    remainingOf(loaded.charge) < round2(Number(loaded.charge.amount))
  ) {
    return {
      success: false,
      error: `לא ניתן לעבור ל${PAYMENT_METHOD[input.method]} אחרי שנרשמו תקבולים.`,
    };
  }

  if (loaded.charge.payment_method === input.method) {
    return { success: true };
  }

  const switchingAwayFromCard =
    loaded.charge.payment_method === "credit_card" &&
    input.method !== "credit_card";

  const { error } = await supabase
    .from("payments")
    .update({
      payment_method: input.method,
      office_collection: true,
      ...(switchingAwayFromCard ? { checkout_id: null } : {}),
    })
    .eq("id", input.paymentId);

  if (error) {
    return { success: false, error: "עדכון אמצעי התשלום נכשל. נסו שוב." };
  }

  if (switchingAwayFromCard) {
    await unlinkPendingCheckout(loaded.charge.checkout_id);
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/**
 * פותח דף סליקה של קארדקום על יתרת חיוב בגבייה שעודכן לאשראי.
 */
export async function startCollectionCardcomCheckout(input: {
  paymentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  if (!isCardcomConfigured()) {
    return { success: false, error: "קארדקום אינו מוגדר — לא ניתן לפתוח סליקה." };
  }

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  if (loaded.charge.payment_method !== "credit_card") {
    return {
      success: false,
      error: "יש לבחור אשראי כאמצעי התשלום לפני הסליקה.",
    };
  }

  const remaining = remainingOf(loaded.charge);
  if (remaining <= 0) {
    return { success: false, error: "החיוב כבר שולם במלואו." };
  }

  if (loaded.charge.checkout_id) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("payment_checkouts")
      .select("id, status, amount, payment_url")
      .eq("id", loaded.charge.checkout_id)
      .maybeSingle();
    if (
      existing?.status === "pending" &&
      existing.payment_url &&
      Math.abs(Number(existing.amount) - remaining) <= 0.05
    ) {
      return { success: true, checkoutUrl: existing.payment_url };
    }
  }

  const charge = await getPaymentProvider().createCharge({
    amount: remaining,
    description: chargeProduct(loaded.charge),
    parentId: loaded.charge.parent_id,
    method: "credit_card",
    paymentIds: [loaded.charge.id],
    metadata: { collections: true },
  });

  if (!charge.success || !charge.redirectUrl) {
    return {
      success: false,
      error: charge.error || "לא הצלחנו לפתוח את דף התשלום. נסו שוב.",
    };
  }

  revalidatePath("/admin/collections");
  return { success: true, checkoutUrl: charge.redirectUrl };
}

/**
 * מאשר חיוב בלי קבלה — כרטיסייה, מכבי או עמית.
 * מסמן כשולם בלי חשבונית או תקבול.
 */
export async function approveCollectionPassCharge(input: {
  paymentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  if (!isReceiptlessCollectionMethod(loaded.charge.payment_method)) {
    return {
      success: false,
      error: "יש לבחור כרטיסייה, מכבי או עמית כאמצעי התשלום לפני האישור.",
    };
  }

  const methodLabel = PAYMENT_METHOD[loaded.charge.payment_method];

  if (remainingOf(loaded.charge) <= 0) {
    return { success: false, error: "החיוב כבר אושר." };
  }

  if ((loaded.charge.payment_receipts ?? []).length > 0) {
    return {
      success: false,
      error: `לחיוב הזה כבר נרשמו תקבולים. לא ניתן לאשר כ${methodLabel}.`,
    };
  }

  const paidAt = new Date().toISOString();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: paidAt,
      office_collection: true,
      checkout_id: null,
    })
    .eq("id", loaded.charge.id);

  if (error) {
    return {
      success: false,
      error: `אישור התשלום ב${methodLabel} נכשל. נסו שוב.`,
    };
  }

  if (loaded.charge.enrollment_id) {
    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .update({ payment_status: "paid" })
      .eq("id", loaded.charge.enrollment_id);

    if (enrollmentError) {
      return {
        success: false,
        error: "החיוב אושר אך עדכון ההרשמה נכשל. רעננו ונסו שוב.",
      };
    }
  }

  if (loaded.charge.checkout_id) {
    await unlinkPendingCheckout(loaded.charge.checkout_id);
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/finance");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

