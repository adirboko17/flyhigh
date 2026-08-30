"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { PAYMENT_METHOD } from "@/lib/constants";
import { subjectLabel } from "@/lib/finance/subject";
import {
  createStandaloneDocument,
  isCardcomConfigured,
  refundCardcomTransaction,
} from "@/lib/integrations/cardcom";
import { loadCustomer } from "@/lib/payments/cardcomCheckout";
import { createAdminClient } from "@/lib/supabase/admin";

export type RefundActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAmount(value: number | string) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return round2(n);
}

export async function refundCardcomPayment(input: {
  paymentId: string;
  amount: number | string;
  note?: string | null;
}): Promise<RefundActionResult> {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { success: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום זיכוי חיובי." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount, status, parent_id, payment_method, receipt_description, external_reference, checkout_id, payment_checkouts(transaction_id), payment_refunds(amount), enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title))"
    )
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment) {
    return { success: false, error: "העסקה לא נמצאה." };
  }
  if (payment.payment_method !== "credit_card") {
    return { success: false, error: "ניתן לזכות מכאן רק עסקאות אשראי." };
  }

  const transactionId =
    payment.external_reference?.trim() ||
    payment.payment_checkouts?.transaction_id?.trim() ||
    null;
  if (!transactionId) {
    return {
      success: false,
      error: "לעסקה אין מספר סליקה של קארדקום, ולכן אי אפשר לזכות אותה מכאן.",
    };
  }

  const alreadyRefunded = round2(
    (payment.payment_refunds ?? []).reduce(
      (sum, refund) => sum + Number(refund.amount),
      0
    )
  );
  const remaining = round2(Math.max(0, Number(payment.amount) - alreadyRefunded));
  if (remaining <= 0) {
    return { success: false, error: "העסקה כבר זוכתה במלואה." };
  }
  if (amount > remaining) {
    return {
      success: false,
      error: `לא ניתן לזכות יותר מהיתרה (${remaining.toFixed(2)} ₪).`,
    };
  }

  let refundTransactionId: string | null = null;
  try {
    const result = await refundCardcomTransaction({
      transactionId,
      amount,
    });
    refundTransactionId = result.refundTransactionId;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "הזיכוי בקארדקום נכשל.",
    };
  }

  const product =
    payment.receipt_description?.trim() ||
    subjectLabel(payment.enrollments) ||
    "זיכוי";
  const note = input.note?.trim() || null;

  let documentNumber: string | null = null;
  let documentUrl: string | null = null;
  let sentToEmail: string | null = null;
  let documentWarning: string | undefined;

  if (!isCardcomConfigured()) {
    documentWarning =
      "הזיכוי לכרטיס עבר, אבל קארדקום אינו מוגדר להפקת חשבונית זיכוי.";
  } else {
    try {
      const customer = await loadCustomer(payment.parent_id);
      const document = await createStandaloneDocument({
        amount,
        description: `זיכוי · ${product}`.slice(0, 250),
        customer,
        paymentMethodLabel: `זיכוי ${PAYMENT_METHOD.credit_card}`,
        asCash: false,
        comment: note,
        documentType: "TaxInvoiceAndReceiptRefund",
      });
      documentNumber = document.documentNumber;
      documentUrl = document.documentUrl;
      sentToEmail = document.sentToEmail;
    } catch (error) {
      documentWarning =
        error instanceof Error
          ? `הזיכוי לכרטיס עבר, אבל הפקת חשבונית הזיכוי נכשלה: ${error.message}`
          : "הזיכוי לכרטיס עבר, אבל הפקת חשבונית הזיכוי נכשלה.";
    }
  }

  const { error } = await admin.from("payment_refunds").insert({
    payment_id: payment.id,
    parent_id: payment.parent_id,
    amount,
    external_reference: refundTransactionId,
    note,
    created_by: profile.id,
    document_number: documentNumber,
    document_url: documentUrl,
    sent_to_email: sentToEmail,
  });

  if (error) {
    return {
      success: false,
      error:
        "הזיכוי עבר בקארדקום, אבל רישום הזיכוי במערכת נכשל. בדקו בממשק קארדקום לפני ניסיון נוסף.",
    };
  }

  if (documentNumber || documentUrl) {
    await admin.from("receipts").insert({
      parent_id: payment.parent_id,
      payment_id: payment.id,
      receipt_number: documentNumber,
      receipt_url: documentUrl,
      sent_to_email: sentToEmail,
    });
  }

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/calendar");
  revalidatePath("/parent/dashboard");
  await revalidatePublicCatalog();
  return { success: true, warning: documentWarning };
}

async function clearPendingRefund(
  pendingRefundId: string | null | undefined,
  paymentId: string
) {
  if (!pendingRefundId) return;
  const admin = createAdminClient();
  await admin
    .from("pending_refunds")
    .delete()
    .eq("id", pendingRefundId)
    .eq("payment_id", paymentId);
}

/** מוציא זיכוי מזיכוי בהמתנה — אשראי בקארדקום, אחרת חשבונית זיכוי בלבד. */
export async function issuePaymentRefund(input: {
  paymentId: string;
  amount: number | string;
  note?: string | null;
  pendingRefundId?: string | null;
}): Promise<RefundActionResult> {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { success: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, amount, status, parent_id, payment_method, receipt_description, external_reference, checkout_id, payment_checkouts(transaction_id)"
    )
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!payment) {
    return { success: false, error: "העסקה לא נמצאה." };
  }

  const transactionId =
    payment.external_reference?.trim() ||
    payment.payment_checkouts?.transaction_id?.trim() ||
    null;

  if (payment.payment_method === "credit_card" && transactionId) {
    const result = await refundCardcomPayment({
      paymentId: input.paymentId,
      amount: input.amount,
      note: input.note,
    });
    if (result.success) {
      await clearPendingRefund(input.pendingRefundId, payment.id);
    }
    return result;
  }

  const amount = parseAmount(input.amount);
  if (amount === null || amount <= 0) {
    return { success: false, error: "נא להזין סכום זיכוי חיובי." };
  }

  const { data: refunds } = await admin
    .from("payment_refunds")
    .select("amount")
    .eq("payment_id", payment.id);
  const alreadyRefunded = round2(
    (refunds ?? []).reduce((sum, refund) => sum + Number(refund.amount), 0)
  );
  const remaining = round2(Math.max(0, Number(payment.amount) - alreadyRefunded));
  if (remaining <= 0) {
    return { success: false, error: "העסקה כבר זוכתה במלואה." };
  }
  if (amount > remaining) {
    return {
      success: false,
      error: `לא ניתן לזכות יותר מהיתרה (${remaining.toFixed(2)} ₪).`,
    };
  }

  const { data: paymentRow } = await admin
    .from("payments")
    .select(
      "receipt_description, enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title))"
    )
    .eq("id", payment.id)
    .maybeSingle();

  const product =
    paymentRow?.receipt_description?.trim() ||
    subjectLabel(paymentRow?.enrollments ?? null) ||
    "זיכוי";
  const note = input.note?.trim() || null;
  const methodLabel =
    (payment.payment_method && PAYMENT_METHOD[payment.payment_method]) ||
    "תשלום";

  let documentNumber: string | null = null;
  let documentUrl: string | null = null;
  let sentToEmail: string | null = null;

  if (!isCardcomConfigured()) {
    return {
      success: false,
      error: "קארדקום אינו מוגדר — לא ניתן להפיק חשבונית זיכוי.",
    };
  }

  try {
    const customer = await loadCustomer(payment.parent_id);
    const document = await createStandaloneDocument({
      amount,
      description: `זיכוי · ${product}`.slice(0, 250),
      customer,
      paymentMethodLabel: `זיכוי ${methodLabel}`,
      asCash: payment.payment_method === "cash",
      comment: note,
      documentType: "TaxInvoiceAndReceiptRefund",
    });
    documentNumber = document.documentNumber;
    documentUrl = document.documentUrl;
    sentToEmail = document.sentToEmail;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "הפקת חשבונית הזיכוי נכשלה.",
    };
  }

  const { error } = await admin.from("payment_refunds").insert({
    payment_id: payment.id,
    parent_id: payment.parent_id,
    amount,
    note,
    created_by: profile.id,
    document_number: documentNumber,
    document_url: documentUrl,
    sent_to_email: sentToEmail,
  });

  if (error) {
    return {
      success: false,
      error: documentNumber
        ? `החשבונית הופקה בקארדקום (מס׳ ${documentNumber}) אך רישום הזיכוי נכשל.`
        : "רישום הזיכוי נכשל. נסו שוב.",
    };
  }

  if (documentNumber || documentUrl) {
    await admin.from("receipts").insert({
      parent_id: payment.parent_id,
      payment_id: payment.id,
      receipt_number: documentNumber,
      receipt_url: documentUrl,
      sent_to_email: sentToEmail,
    });
  }

  await clearPendingRefund(input.pendingRefundId, payment.id);

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/classes");
  revalidatePath("/parent/dashboard");
  return { success: true };
}

/** מוחק זיכוי בהמתנה בלי להוציא זיכוי. */
export async function dismissPendingRefund(input: {
  pendingRefundId: string;
}): Promise<RefundActionResult> {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { success: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_refunds")
    .delete()
    .eq("id", input.pendingRefundId);

  if (error) {
    return { success: false, error: "מחיקת הזיכוי בהמתנה נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/refunds");
  return { success: true };
}
