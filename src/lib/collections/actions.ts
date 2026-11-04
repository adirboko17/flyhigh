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
  isLowProfilePageOpen,
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
import { issueOfficeCreditInvoice } from "@/lib/payments/refundActions";
import { allocateInvoices } from "@/lib/collections/invoiceSplit";
import {
  parseSplitParts,
  splitPartsMatchTotal,
  syncEnrollmentPaymentStatus,
} from "@/lib/payments/splitParts";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type CollectionActionResult =
  | { success: true; checkoutUrl?: string; warning?: string }
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
  receipt_label_id: string | null;
  income_class_id: string | null;
  enrollments: {
    type: Enums<"enrollment_type">;
    children: { full_name: string } | null;
    classes: { title: string } | null;
    programs: { title: string } | null;
    pool_passes: { title: string } | null;
    private_lessons: { title: string } | null;
  } | null;
  payment_receipts: { id: string; amount: number }[] | null;
};

const CHARGE_SELECT =
  "id, amount, status, parent_id, enrollment_id, payment_method, office_collection, checkout_id, receipt_description, receipt_custom_text, receipt_label_id, income_class_id, enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(id, amount)";

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
  description?: string | null;
}) {
  if (!isCardcomConfigured()) {
    throw new Error("קארדקום אינו מוגדר — לא ניתן להפיק חשבונית.");
  }

  const customer = await loadCustomer(input.charge.parent_id);
  const method = input.charge.payment_method;
  const methodLabel = method ? PAYMENT_METHOD[method] : "תשלום";
  const documentDate = input.receivedAt.slice(0, 10);
  const description = input.description?.trim() || chargeProduct(input.charge);

  return createStandaloneDocument({
    amount: input.amount,
    description,
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
  product?: string;
}) {
  const customer = await loadCustomer(input.charge.parent_id);
  const childName = input.charge.enrollments?.children?.full_name;

  await notifyAdminPayment({
    paid: true,
    parentName: customer.name,
    phone: customer.phone,
    email: customer.email,
    product: input.product?.trim() || chargeProduct(input.charge),
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
  const receiptless = isReceiptlessCollectionMethod(input.charge.payment_method);
  let document: Awaited<ReturnType<typeof issueCollectionDocument>> | null = null;
  if (!receiptless) {
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
  }

  const admin = createAdminClient();
  const { error } = await admin.from("payment_receipts").insert({
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
      error: document?.documentNumber
        ? `החשבונית הופקה בקארדקום (מס׳ ${document.documentNumber}) אך רישום התקבול נכשל.`
        : "רישום התקבול נכשל. נסו שוב.",
    };
  }

  if (document) {
    await admin.from("receipts").insert({
      parent_id: input.charge.parent_id,
      payment_id: input.charge.id,
      receipt_number: document.documentNumber,
      receipt_url: document.documentUrl,
      sent_to_email: document.sentToEmail,
    });
  }

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

function receiptIssuedTaxInvoice(method: Enums<"payment_method"> | null) {
  return isManualReceiptMethod(method) || method === "credit_card";
}

/** מוחק תקבול בודד — היתרה והסטטוס מחושבים מחדש בטריגר. */
export async function deletePaymentReceipt(input: {
  receiptId: string;
  issueCreditInvoice?: boolean;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: receipt } = await supabase
    .from("payment_receipts")
    .select(
      "id, amount, payment_id, payments(payment_method, office_collection)"
    )
    .eq("id", input.receiptId)
    .maybeSingle();

  if (!receipt) {
    return { success: false, error: "התקבול לא נמצא." };
  }

  if (!isCollectionManagedCharge(receipt.payments ?? {})) {
    return { success: false, error: "תקבול זה אינו מנוהל דרך רשימת הגבייה." };
  }

  if (receiptIssuedTaxInvoice(receipt.payments?.payment_method ?? null)) {
    if (!input.issueCreditInvoice) {
      return {
        success: false,
        error:
          "אי אפשר להסיר תקבול עם חשבונית מס-קבלה בלי להפיק חשבונית זיכוי. אחרת החיוב יישאר פתוח והחשבונית תישאר בתוקף.",
      };
    }
    const credit = await issueOfficeCreditInvoice({
      paymentId: receipt.payment_id,
      amount: Number(receipt.amount),
      note: "ביטול תקבול בגבייה",
    });
    if (!credit.success) return credit;
  }

  const { error } = await supabase
    .from("payment_receipts")
    .delete()
    .eq("id", receipt.id);

  if (error) {
    return { success: false, error: "מחיקת התקבול נכשלה. נסו שוב." };
  }

  await revalidateAfterEnrollmentChange();
  return { success: true };
}

/**
 * מחזיר חיוב ששולם לחוב פתוח: משאירים תקבולים תקפים, מסירים את השאר,
 * ואופציונלית מפיקים חשבונית זיכוי על כל תקבול שהוסרה לו חשבונית מס-קבלה.
 */
export async function reopenCollectionCharge(input: {
  paymentId: string;
  removeReceiptIds?: string[];
  issueCreditInvoices?: boolean;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const charge = loaded.charge;
  const removeIds = [...new Set(input.removeReceiptIds ?? [])];

  if (
    isReceiptlessChargeSettled(charge.payment_method, charge.status) &&
    (charge.payment_receipts ?? []).length === 0
  ) {
    if (removeIds.length > 0) {
      return {
        success: false,
        error: "לחיוב בלי תקבולים אין מה להסיר — רק לאשר את ההחזרה לחוב פתוח.",
      };
    }

    const { error } = await supabase
      .from("payments")
      .update({
        status: "pending",
        paid_at: null,
        office_collection: true,
      })
      .eq("id", charge.id);

    if (error) {
      return { success: false, error: "ההחזרה לחוב פתוח נכשלה. נסו שוב." };
    }

    await syncEnrollmentPaymentStatus(supabase, charge.enrollment_id);
    await revalidateAfterEnrollmentChange();
    return { success: true };
  }

  const receipts = charge.payment_receipts ?? [];
  if (receipts.length === 0) {
    if (charge.status !== "paid") {
      return {
        success: false,
        error: "אין תקבולים להסרה, והחיוב אינו מסומן כשולם.",
      };
    }

    const { error } = await supabase
      .from("payments")
      .update({
        status: "pending",
        paid_at: null,
        office_collection: true,
      })
      .eq("id", charge.id);

    if (error) {
      return { success: false, error: "ההחזרה לחוב פתוח נכשלה. נסו שוב." };
    }

    await syncEnrollmentPaymentStatus(supabase, charge.enrollment_id);
    await revalidateAfterEnrollmentChange();
    return { success: true };
  }

  if (removeIds.length === 0) {
    return {
      success: false,
      error: "בחרו לפחות תקבול אחד להסרה, אחרת החיוב נשאר שולם.",
    };
  }

  const receiptById = new Map(receipts.map((receipt) => [receipt.id, receipt]));
  const toRemove = removeIds.map((id) => receiptById.get(id));
  if (toRemove.some((receipt) => !receipt)) {
    return { success: false, error: "חלק מהתקבולים שנבחרו לא שייכים לחיוב הזה." };
  }

  const removed = toRemove.filter(
    (receipt): receipt is { id: string; amount: number } => Boolean(receipt)
  );

  if (receiptIssuedTaxInvoice(charge.payment_method)) {
    if (!input.issueCreditInvoices) {
      return {
        success: false,
        error:
          "אי אפשר להחזיר לחוב פתוח תקבול עם חשבונית מס-קבלה בלי להפיק חשבונית זיכוי.",
      };
    }
    for (const receipt of removed) {
      const credit = await issueOfficeCreditInvoice({
        paymentId: charge.id,
        amount: Number(receipt.amount),
        note: "החזרה לחוב פתוח — ביטול תקבול",
      });
      if (!credit.success) {
        return {
          success: false,
          error: `חשבונית הזיכוי נכשלה לפני הסרת התקבולים: ${credit.error}`,
        };
      }
    }
  }

  const { error } = await supabase
    .from("payment_receipts")
    .delete()
    .eq("payment_id", charge.id)
    .in("id", removed.map((receipt) => receipt.id));

  if (error) {
    return {
      success: false,
      error: input.issueCreditInvoices
        ? "חשבוניות הזיכוי הופקו, אבל הסרת התקבולים נכשלה. רעננו ובדקו את הגבייה."
        : "הסרת התקבולים נכשלה. נסו שוב.",
    };
  }

  await revalidateAfterEnrollmentChange();
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

const INVOICE_SPLIT_METHODS = ["cash", "bank_transfer", "paybox"] as const;

type InvoiceSplitMethod = (typeof INVOICE_SPLIT_METHODS)[number];

function isInvoiceSplitMethod(method: string): method is InvoiceSplitMethod {
  return (INVOICE_SPLIT_METHODS as readonly string[]).includes(method);
}

/** משאיר תקבול קיים על החיוב המקורי, ופותח חיוב חדש על היתרה באמצעי התשלום של החשבוניות. */
async function peelUnpaidRemainder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  charge: ChargeRow,
  remaining: number,
  paid: number,
  method: InvoiceSplitMethod
): Promise<{ charge: ChargeRow } | { error: string }> {
  const { error: shrinkError } = await supabase
    .from("payments")
    .update({ amount: paid, status: "paid" })
    .eq("id", charge.id);
  if (shrinkError) {
    return { error: "הפרדת היתרה מהתקבול שכבר נרשם נכשלה. נסו שוב." };
  }

  const { data: created, error: insertError } = await supabase
    .from("payments")
    .insert({
      parent_id: charge.parent_id,
      enrollment_id: charge.enrollment_id,
      amount: remaining,
      payment_method: method,
      office_collection: true,
      status: "pending",
      receipt_label_id: charge.receipt_label_id,
      receipt_description: charge.receipt_description,
      receipt_custom_text: charge.receipt_custom_text,
      income_class_id: charge.income_class_id,
    })
    .select(CHARGE_SELECT)
    .single();

  if (insertError || !created) {
    await supabase
      .from("payments")
      .update({ amount: charge.amount, status: charge.status })
      .eq("id", charge.id);
    return { error: "פתיחת חיוב ליתרה נכשלה. נסו שוב." };
  }

  await syncEnrollmentPaymentStatus(supabase, charge.enrollment_id);
  return { charge: created as ChargeRow };
}

/**
 * מוציא כמה חשבוניות מס-קבלה על יתרה של חיוב אחד או יותר.
 * הסכומים נסגרים על החיובים לפי הסדר, וכל חשבונית יכולה לשאת שם משלה.
 */
export async function issueCollectionInvoices(input: {
  paymentIds: string[];
  method: string;
  receivedAt?: string | null;
  invoices: { amount: number | string; name: string }[];
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  if (!isCardcomConfigured()) {
    return { success: false, error: "קארדקום אינו מוגדר — לא ניתן להפיק חשבונית." };
  }

  if (!isInvoiceSplitMethod(input.method)) {
    return {
      success: false,
      error: "אפשר להוציא חשבוניות מפוצלות על מזומן, העברה או פייבוקס.",
    };
  }

  const paymentIds = [...new Set(input.paymentIds)];
  if (paymentIds.length === 0) {
    return { success: false, error: "בחרו לפחות חיוב אחד." };
  }
  if (paymentIds.length > 20) {
    return { success: false, error: "אפשר לאחד עד 20 חיובים בבת אחת." };
  }

  if (input.invoices.length < 1 || input.invoices.length > 8) {
    return { success: false, error: "אפשר להוציא בין חשבונית אחת לשמונה." };
  }

  const invoices = input.invoices.map((invoice) => ({
    amount: parseAmount(invoice.amount),
    name: invoice.name.trim(),
  }));
  if (invoices.some((invoice) => invoice.amount === null || invoice.amount <= 0)) {
    return { success: false, error: "כל חשבונית חייבת להיות בסכום חיובי." };
  }
  if (invoices.some((invoice) => !invoice.name || invoice.name.length > 250)) {
    return { success: false, error: "לכל חשבונית צריך שם, עד 250 תווים." };
  }

  const receivedAt = input.receivedAt?.trim()
    ? new Date(input.receivedAt).toISOString()
    : new Date().toISOString();
  if (Number.isNaN(Date.parse(receivedAt))) {
    return { success: false, error: "תאריך התקבול אינו תקין." };
  }

  const supabase = await createClient();
  const loaded: ChargeRow[] = [];
  for (const paymentId of paymentIds) {
    const result = await loadCollectionCharge(supabase, paymentId);
    if ("error" in result) return { success: false, error: result.error };
    loaded.push(result.charge);
  }

  const parentId = loaded[0]?.parent_id;
  if (!parentId || loaded.some((charge) => charge.parent_id !== parentId)) {
    return { success: false, error: "אפשר לאחד רק חיובים של אותה לקוחה." };
  }

  const targets: ChargeRow[] = [];
  for (const charge of loaded) {
    const remaining = remainingOf(charge);
    if (remaining <= 0) {
      return { success: false, error: "אחד החיובים שנבחרו כבר שולם." };
    }
    const paid = round2(Number(charge.amount) - remaining);
    if (paid > 0 && charge.payment_method !== input.method) {
      const peeled = await peelUnpaidRemainder(supabase, charge, remaining, paid, input.method);
      if ("error" in peeled) return { success: false, error: peeled.error };
      targets.push(peeled.charge);
      continue;
    }
    if (charge.payment_method !== input.method) {
      const switchingAwayFromCard = charge.payment_method === "credit_card";
      const { error } = await supabase
        .from("payments")
        .update({
          payment_method: input.method,
          office_collection: true,
          ...(switchingAwayFromCard ? { checkout_id: null } : {}),
        })
        .eq("id", charge.id);
      if (error) {
        return { success: false, error: "עדכון אמצעי התשלום נכשל. נסו שוב." };
      }
      if (switchingAwayFromCard) {
        await unlinkPendingCheckout(charge.checkout_id);
      }
      charge.payment_method = input.method;
      charge.office_collection = true;
      charge.checkout_id = null;
    }
    targets.push(charge);
  }

  const shares = targets.map((charge) => ({
    id: charge.id,
    remaining: remainingOf(charge),
  }));
  const allocated = allocateInvoices(
    shares,
    invoices.map((invoice) => invoice.amount ?? 0)
  );
  if (!allocated.ok) return { success: false, error: allocated.error };

  const byId = new Map(targets.map((charge) => [charge.id, charge]));
  const issued: string[] = [];
  const admin = createAdminClient();

  for (let index = 0; index < invoices.length; index += 1) {
    const invoice = invoices[index];
    const amount = invoice.amount ?? 0;
    const slices = allocated.slices.filter((slice) => slice.invoiceIndex === index);
    const anchor = byId.get(slices[0]?.paymentId ?? "");
    if (!anchor || slices.length === 0) {
      return { success: false, error: "חלוקת הסכומים על החיובים נכשלה." };
    }

    let document: Awaited<ReturnType<typeof issueCollectionDocument>>;
    try {
      document = await issueCollectionDocument({
        charge: anchor,
        amount,
        receivedAt,
        note: null,
        description: invoice.name,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "הפקת החשבונית בקארדקום נכשלה.";
      return {
        success: false,
        error: issued.length
          ? `${reason} החשבוניות שכבר הופקו: ${issued.join(", ")}.`
          : reason,
      };
    }

    const { error: receiptError } = await admin.from("payment_receipts").insert(
      slices.map((slice) => ({
        payment_id: slice.paymentId,
        amount: slice.amount,
        received_at: receivedAt,
        note: invoice.name,
        created_by: profile.id,
      }))
    );

    if (receiptError) {
      return {
        success: false,
        error: document.documentNumber
          ? `החשבונית הופקה בקארדקום (מס׳ ${document.documentNumber}) אך רישום התקבול נכשל.`
          : "רישום התקבול נכשל. נסו שוב.",
      };
    }

    const { error: documentRowError } = await admin.from("receipts").insert({
      parent_id: parentId,
      payment_id: anchor.id,
      receipt_number: document.documentNumber,
      receipt_url: document.documentUrl,
      sent_to_email: document.sentToEmail,
      description: invoice.name,
      amount,
    });

    if (documentRowError) {
      return {
        success: false,
        error: document.documentNumber
          ? `החשבונית הופקה (מס׳ ${document.documentNumber}) והיתרה עודכנה, אבל שמירתה בכרטיס הלקוח נכשלה. אל תפיקו אותה שוב.`
          : "היתרה עודכנה, אבל שמירת החשבונית בכרטיס הלקוח נכשלה. אל תפיקו אותה שוב.",
      };
    }

    issued.push(
      document.documentNumber
        ? `${invoice.name} (${document.documentNumber})`
        : invoice.name
    );

    try {
      await notifyCollectionPaid({
        charge: anchor,
        amount,
        product: invoice.name,
      });
    } catch (error) {
      console.error("[admin-payment-email] split invoice notify failed", error);
    }
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/finance");
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

/**
 * מעדכן את סכום החיוב בגבייה לכל סכום חיובי — בלי קשר לסכום המקורי.
 * היתרה והסטטוס מחושבים מחדש לפי התקבולים שכבר נרשמו.
 */
export async function updateCollectionChargeAmount(input: {
  paymentId: string;
  amount: number | string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום חיוב חיובי." };
  }
  if (amount > 99_999_999.99) {
    return { success: false, error: "הסכום גבוה מדי." };
  }

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const charge = loaded.charge;
  if (round2(Number(charge.amount)) === amount) {
    return { success: true };
  }

  const receiptPaid = round2(
    (charge.payment_receipts ?? []).reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0
    )
  );
  if (receiptPaid > 0 && amount < receiptPaid) {
    return {
      success: false,
      error: `לא ניתן להוריד את הסכום מתחת לתקבולים שכבר נרשמו (${receiptPaid.toFixed(2)} ₪). מחקו תקבול אם זו טעות.`,
    };
  }

  const receiptlessPaid = isReceiptlessChargeSettled(
    charge.payment_method,
    charge.status
  );

  let status = charge.status;
  let paidAt: string | null | undefined;

  if (!receiptlessPaid) {
    if (receiptPaid <= 0) {
      status = "pending";
      paidAt = null;
    } else if (receiptPaid < amount) {
      status = "partial";
    } else {
      status = "paid";
      if (charge.status !== "paid") {
        paidAt = new Date().toISOString();
      }
    }
  }

  const { error } = await supabase
    .from("payments")
    .update({
      amount,
      status,
      ...(paidAt !== undefined ? { paid_at: paidAt } : {}),
      ...(charge.checkout_id ? { checkout_id: null } : {}),
    })
    .eq("id", charge.id);

  if (error) {
    return { success: false, error: "עדכון סכום החיוב נכשל. נסו שוב." };
  }

  await syncEnrollmentPaymentStatus(supabase, charge.enrollment_id);

  if (charge.checkout_id) {
    await unlinkPendingCheckout(charge.checkout_id);
  }

  await revalidateAfterEnrollmentChange();
  return { success: true };
}

/**
 * מסיר חיוב פתוח בלי לגבות ובלי להפיק מסמך.
 * אם אין חיובים נוספים להרשמה, היא נשארת פעילה במצב «ללא חיוב».
 */
export async function waiveCollectionCharge(input: {
  paymentId: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const { data: details } = await supabase
    .from("payments")
    .select(
      "id, status, external_reference, enrollment_id, payment_receipts(id), payment_refunds(id)"
    )
    .eq("id", loaded.charge.id)
    .maybeSingle();

  if (!details) {
    return { success: false, error: "החיוב לא נמצא." };
  }

  const { data: documents } = await supabase
    .from("receipts")
    .select("id")
    .eq("payment_id", details.id);

  const blocked =
    details.status !== "pending" ||
    (details.payment_receipts ?? []).length > 0 ||
    (details.payment_refunds ?? []).length > 0 ||
    (documents ?? []).length > 0 ||
    Boolean(details.external_reference?.trim()) ||
    isReceiptlessChargeSettled(loaded.charge.payment_method, details.status);

  if (blocked) {
    return {
      success: false,
      error:
        "אפשר לסמן «ללא חיוב» רק על חיוב פתוח שעוד לא נרשם לו תקבול, סליקה או חשבונית.",
    };
  }

  let siblingCount = 0;
  let previousStatus: Enums<"enrollment_payment_status"> | null = null;

  if (details.enrollment_id) {
    const { count, error: countError } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", details.enrollment_id)
      .neq("id", details.id);

    if (countError) {
      return { success: false, error: "בדיקת החיובים של ההרשמה נכשלה. נסו שוב." };
    }

    siblingCount = count ?? 0;

    if (siblingCount === 0) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("payment_status")
        .eq("id", details.enrollment_id)
        .maybeSingle();

      previousStatus = enrollment?.payment_status ?? null;

      if (
        previousStatus === "unpaid" ||
        previousStatus === "partial" ||
        previousStatus === "paid"
      ) {
        const { error: statusError } = await supabase
          .from("enrollments")
          .update({ payment_status: "no_charge" })
          .eq("id", details.enrollment_id);

        if (statusError) {
          return {
            success: false,
            error: "עדכון ההרשמה ל«ללא חיוב» נכשל. החיוב נשאר כפי שהיה.",
          };
        }
      }
    }
  }

  if (loaded.charge.checkout_id) {
    await unlinkPendingCheckout(loaded.charge.checkout_id);
  }

  const { error: deleteError } = await supabase
    .from("payments")
    .delete()
    .eq("id", details.id);

  if (deleteError) {
    if (
      details.enrollment_id &&
      previousStatus &&
      (previousStatus === "unpaid" ||
        previousStatus === "partial" ||
        previousStatus === "paid")
    ) {
      await supabase
        .from("enrollments")
        .update({ payment_status: previousStatus })
        .eq("id", details.enrollment_id);
    }
    return { success: false, error: "הסרת החיוב נכשלה. נסו שוב." };
  }

  if (details.enrollment_id && siblingCount > 0) {
    await syncEnrollmentPaymentStatus(supabase, details.enrollment_id);
  }

  await revalidateAfterEnrollmentChange();
  return { success: true };
}

/**
 * מפצל חיוב פתוח לכמה חיובים עם אמצעי תשלום שונים.
 * כל חלק נגבה בנפרד — וחשבונית מס-קבלה יוצאת עם כל תקבול.
 */
export async function splitCollectionCharge(input: {
  paymentId: string;
  parts: { method: string; amount: number | string }[];
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  const parsed = parseSplitParts(input.parts);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const loaded = await loadCollectionCharge(supabase, input.paymentId);
  if ("error" in loaded) {
    return { success: false, error: loaded.error };
  }

  const charge = loaded.charge;
  if (isReceiptlessChargeSettled(charge.payment_method, charge.status)) {
    return {
      success: false,
      error: "אי אפשר לפצל חיוב שכבר אושר. החזירו אותו לחוב פתוח קודם.",
    };
  }

  const remaining = remainingOf(charge);
  if (remaining <= 0) {
    return {
      success: false,
      error: "אי אפשר לפצל חיוב שכבר שולם במלואו.",
    };
  }

  const receiptPaid = round2(
    (charge.payment_receipts ?? []).reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0
    )
  );

  if (!splitPartsMatchTotal(parsed.parts, remaining)) {
    return {
      success: false,
      error: `סכום החלקים חייב להיות בדיוק ${remaining.toFixed(2)} ₪.`,
    };
  }

  const shared = {
    parent_id: charge.parent_id,
    enrollment_id: charge.enrollment_id,
    receipt_label_id: charge.receipt_label_id,
    receipt_description: charge.receipt_description,
    receipt_custom_text: charge.receipt_custom_text,
    income_class_id: charge.income_class_id,
    office_collection: true,
    status: "pending" as const,
    paid_at: null,
    checkout_id: null,
  };

  if (receiptPaid > 0) {
    const { error: keepError } = await supabase
      .from("payments")
      .update({
        amount: receiptPaid,
        status: "paid",
        checkout_id: null,
      })
      .eq("id", charge.id);

    if (keepError) {
      return { success: false, error: "עדכון החיוב המקורי נכשל. נסו שוב." };
    }

    const { error: insertError } = await supabase.from("payments").insert(
      parsed.parts.map((part) => ({
        ...shared,
        amount: part.amount,
        payment_method: part.method,
      }))
    );

    if (insertError) {
      return {
        success: false,
        error: "החיוב המקורי עודכן, אבל יצירת החלקים החדשים נכשלה. רעננו ונסו שוב.",
      };
    }
  } else {
    const [first, ...rest] = parsed.parts;
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        amount: first.amount,
        payment_method: first.method,
        office_collection: true,
        status: "pending",
        paid_at: null,
        checkout_id: null,
      })
      .eq("id", charge.id);

    if (updateError) {
      return { success: false, error: "פיצול החיוב נכשל. נסו שוב." };
    }

    if (rest.length > 0) {
      const { error: insertError } = await supabase.from("payments").insert(
        rest.map((part) => ({
          ...shared,
          amount: part.amount,
          payment_method: part.method,
        }))
      );

      if (insertError) {
        return {
          success: false,
          error: "החלק הראשון עודכן, אבל יצירת שאר החלקים נכשלה. רעננו ונסו שוב.",
        };
      }
    }
  }

  if (charge.checkout_id) {
    await unlinkPendingCheckout(charge.checkout_id);
  }

  await syncEnrollmentPaymentStatus(supabase, charge.enrollment_id);
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
  /** ברירת המחדל היא היתרה. סכום קטן יותר נשאר כחוב פתוח אחרי התשלום. */
  amount?: number | string | null;
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

  let amount = remaining;
  if (input.amount != null && input.amount !== "") {
    const parsed = parseAmount(input.amount);
    if (parsed === null || parsed <= 0) {
      return { success: false, error: "נא להזין סכום לתשלום." };
    }
    if (parsed - remaining > 0.05) {
      return {
        success: false,
        error: `לא ניתן לגבות יותר מהיתרה (${remaining.toFixed(2)} ₪).`,
      };
    }
    amount = parsed;
  }

  if (loaded.charge.checkout_id) {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("payment_checkouts")
      .select("id, status, amount, payment_url, low_profile_id")
      .eq("id", loaded.charge.checkout_id)
      .maybeSingle();
    const sameAmount =
      existing?.payment_url &&
      Math.abs(Number(existing.amount) - amount) <= 0.05;
    const pageStillOpen =
      sameAmount && existing?.low_profile_id
        ? await isLowProfilePageOpen(existing.low_profile_id)
        : false;
    if (
      existing?.status === "pending" &&
      existing.payment_url &&
      pageStillOpen
    ) {
      return { success: true, checkoutUrl: existing.payment_url };
    }
    if (existing?.status === "pending") {
      await unlinkPendingCheckout(existing.id);
    }
  }

  const charge = await getPaymentProvider().createCharge({
    amount,
    description: chargeProduct(loaded.charge),
    parentId: loaded.charge.parent_id,
    method: "credit_card",
    paymentIds: [loaded.charge.id],
    metadata: { collections: true },
    allowPartial: amount + 0.05 < remaining,
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
      error: "יש לבחור כרטיסייה, מכבי/לאומית או עמית כאמצעי התשלום לפני האישור.",
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

  await syncEnrollmentPaymentStatus(supabase, loaded.charge.enrollment_id);

  if (loaded.charge.checkout_id) {
    await unlinkPendingCheckout(loaded.charge.checkout_id);
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/reports");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

const CHARGE_TEXT_MAX = 120;

/**
 * פותח חיוב משרדי ללקוח בלי הרשמה — מסגירה בטלפון.
 * אשראי ממשיך מיד לדף הסליקה. שאר האמצעים נפתחים כחוב בעמוד הגבייה.
 */
export async function createCustomerCharge(input: {
  parentId: string;
  amount: number | string;
  method: CollectionPaymentMethod;
  receiptLabelId: string | null;
  description: string;
  customText: string;
}): Promise<CollectionActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return NOT_ALLOWED;

  if (!isCollectionPaymentMethod(input.method)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו תקין." };
  }

  if (input.method === "credit_card" && !isCardcomConfigured()) {
    return {
      success: false,
      error: "קארדקום אינו מוגדר — לא ניתן לחייב באשראי.",
    };
  }

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום חיוב חיובי." };
  }
  if (amount > 99_999_999.99) {
    return { success: false, error: "הסכום גבוה מדי." };
  }

  const description = input.description.trim();
  const customText = input.customText.trim();
  if (description.length > CHARGE_TEXT_MAX || customText.length > CHARGE_TEXT_MAX) {
    return {
      success: false,
      error: `התיאור והטקסט המותאם יכולים להכיל עד ${CHARGE_TEXT_MAX} תווים.`,
    };
  }

  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", input.parentId)
    .maybeSingle();

  if (!parent || parent.role !== "parent") {
    return { success: false, error: "הלקוח לא נמצא." };
  }

  const resolved = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

  if (!resolved.labelId && !description && !customText) {
    return {
      success: false,
      error: "נא להזין תיאור לחיוב, לבחור שם לקבלה, או לכתוב טקסט מותאם.",
    };
  }

  const { data: created, error } = await supabase
    .from("payments")
    .insert({
      parent_id: input.parentId,
      enrollment_id: null,
      amount,
      payment_method: input.method,
      status: "pending",
      office_collection: true,
      receipt_label_id: resolved.labelId,
      receipt_description: resolved.description ?? (description || null),
      receipt_custom_text: customText || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { success: false, error: "יצירת החיוב נכשלה. נסו שוב." };
  }

  if (input.method === "credit_card") {
    const checkout = await startCollectionCardcomCheckout({
      paymentId: created.id,
    });
    if (!checkout.success || !checkout.checkoutUrl) {
      await supabase.from("payments").delete().eq("id", created.id);
      return {
        success: false,
        error: checkout.success
          ? "לא הצלחנו לפתוח את דף הסליקה."
          : checkout.error,
      };
    }
    revalidatePath("/admin/customers");
    return { success: true, checkoutUrl: checkout.checkoutUrl };
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/customers");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

