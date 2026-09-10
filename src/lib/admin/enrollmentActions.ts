"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { isInvoiceRefundMethod } from "@/lib/constants";
import {
  paymentHasRecordedMoney,
  type RecordedMoneyPayment,
} from "@/lib/payments/recordedMoney";
import {
  issueOfficeCreditInvoice,
  refundCardcomPayment,
} from "@/lib/payments/refundActions";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type AdminEnrollmentActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string };

export type EnrollmentCreditTarget = {
  paymentId: string;
  remaining: number;
  paymentMethod: Enums<"payment_method"> | null;
  refundsCard: boolean;
};

export type EnrollmentCancellationPreview = {
  creditTargets: EnrollmentCreditTarget[];
  creditTotal: number;
  openChargeCount: number;
};

export async function revalidateAfterEnrollmentChange() {
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/collections");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/refunds");
  revalidatePath("/parent/dashboard");
}

type LinkedPayment = RecordedMoneyPayment & {
  amount: number;
  payment_receipts: { id: string; amount: number }[] | null;
  payment_refunds?: { amount: number }[] | null;
  receipts?: { receipt_number: string | null }[] | null;
  payment_checkouts?: { transaction_id: string | null } | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function invoicedRemaining(payment: LinkedPayment) {
  if (!isInvoiceRefundMethod(payment.payment_method)) return 0;
  const alreadyRefunded = round2(
    (payment.payment_refunds ?? []).reduce(
      (sum, refund) => sum + Number(refund.amount),
      0
    )
  );
  const receiptPaid = round2(
    (payment.payment_receipts ?? []).reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0
    )
  );
  const hasIssuedInvoice = (payment.receipts ?? []).some((doc) =>
    Boolean(doc.receipt_number?.trim())
  );
  const invoiced =
    receiptPaid > 0
      ? receiptPaid
      : hasIssuedInvoice ||
          payment.status === "paid" ||
          payment.status === "refunded"
        ? Number(payment.amount)
        : 0;
  return round2(Math.max(0, invoiced - alreadyRefunded));
}

function hasCardcomRefund(payment: LinkedPayment) {
  return (
    payment.payment_method === "credit_card" &&
    Boolean(
      payment.external_reference?.trim() ||
        payment.payment_checkouts?.transaction_id?.trim()
    )
  );
}

const PAYMENT_PREVIEW_SELECT =
  "id, amount, status, parent_id, payment_method, external_reference, office_collection, payment_receipts(id, amount), payment_refunds(amount), receipts(receipt_number), payment_checkouts(transaction_id)";

async function loadEnrollmentPayments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrollmentId: string
) {
  const { data: payments } = await supabase
    .from("payments")
    .select(PAYMENT_PREVIEW_SELECT)
    .eq("enrollment_id", enrollmentId);
  return (payments ?? []) as LinkedPayment[];
}

function creditTargetsOf(payments: LinkedPayment[]): EnrollmentCreditTarget[] {
  return payments.flatMap((payment) => {
    const remaining = invoicedRemaining(payment);
    if (remaining <= 0) return [];
    return [
      {
        paymentId: payment.id,
        remaining,
        paymentMethod: payment.payment_method,
        refundsCard: hasCardcomRefund(payment),
      },
    ];
  });
}

async function cancelLinkedBookings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrollmentId: string
) {
  await supabase
    .from("private_lesson_slots")
    .update({ status: "cancelled" })
    .eq("enrollment_id", enrollmentId)
    .in("status", ["awaiting_schedule", "scheduled"]);
  await supabase
    .from("activity_bookings")
    .update({ status: "cancelled" })
    .eq("enrollment_id", enrollmentId)
    .in("status", ["awaiting_schedule", "scheduled"]);
}

export async function loadEnrollmentCancellationPreview(
  enrollmentId: string
): Promise<EnrollmentCancellationPreview | null> {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enrollment) return null;

  const paymentRows = await loadEnrollmentPayments(supabase, enrollment.id);
  const documentsByPayment = await loadDocumentIds(
    supabase,
    paymentRows.map((payment) => payment.id)
  );
  const creditTargets = creditTargetsOf(paymentRows);
  const openChargeCount = paymentRows.filter(
    (payment) =>
      !paymentHasRecordedMoney({
        ...payment,
        documentIds: documentsByPayment.get(payment.id),
      })
  ).length;

  return {
    creditTargets,
    creditTotal: round2(
      creditTargets.reduce((sum, target) => sum + target.remaining, 0)
    ),
    openChargeCount,
  };
}

async function loadDocumentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentIds: string[]
) {
  const documentsByPayment = new Map<string, string[]>();
  if (paymentIds.length === 0) return documentsByPayment;
  const { data: documents } = await supabase
    .from("receipts")
    .select("id, payment_id")
    .in("payment_id", paymentIds);
  for (const document of documents ?? []) {
    if (!document.payment_id) continue;
    const list = documentsByPayment.get(document.payment_id) ?? [];
    list.push(document.id);
    documentsByPayment.set(document.payment_id, list);
  }
  return documentsByPayment;
}

async function issueEnrollmentCreditInvoices(targets: EnrollmentCreditTarget[]) {
  const warnings: string[] = [];
  for (const target of targets) {
    const result = target.refundsCard
      ? await refundCardcomPayment({
          paymentId: target.paymentId,
          amount: target.remaining,
          note: "הסרה מההרשמה",
        })
      : await issueOfficeCreditInvoice({
          paymentId: target.paymentId,
          amount: target.remaining,
          note: "הסרה מההרשמה",
        });
    if (!result.success) {
      return {
        success: false as const,
        error: `חשבונית הזיכוי נכשלה, וההרשמה לא בוטלה: ${result.error}`,
      };
    }
    if (result.warning) warnings.push(result.warning);
  }
  return { success: true as const, warning: warnings[0] };
}

/**
 * ביטול הרשמה מממשק הניהול.
 * מסיר מהחוג/המוצר, מבטל תורים מקושרים, ומוחק חיוב פתוח בלי תקבולים.
 * אם יש חשבונית מס-קבלה, אפשר להפיק חשבונית זיכוי באותה פעולה.
 */
export async function cancelAdminEnrollment(
  enrollmentId: string,
  options?: { issueCreditInvoice?: boolean }
): Promise<AdminEnrollmentActionResult> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "ההרשמה לא נמצאה." };
  }

  const paymentRows = await loadEnrollmentPayments(supabase, enrollment.id);
  const creditTargets = creditTargetsOf(paymentRows);
  let creditWarning: string | undefined;

  if (options?.issueCreditInvoice && creditTargets.length > 0) {
    const credited = await issueEnrollmentCreditInvoices(creditTargets);
    if (!credited.success) return credited;
    creditWarning = credited.warning;
  }

  const documentsByPayment = await loadDocumentIds(
    supabase,
    paymentRows.map((payment) => payment.id)
  );
  const removableIds = paymentRows
    .filter(
      (payment) =>
        !paymentHasRecordedMoney({
          ...payment,
          documentIds: documentsByPayment.get(payment.id),
        })
    )
    .map((payment) => payment.id);

  await cancelLinkedBookings(supabase, enrollment.id);

  if (enrollment.status !== "cancelled") {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: "cancelled" })
      .eq("id", enrollment.id);
    if (error) {
      return {
        success: false,
        error: creditWarning
          ? "חשבונית הזיכוי הופקה, אבל ביטול ההרשמה נכשל. נסו שוב."
          : "ביטול ההרשמה נכשל. נסו שוב.",
      };
    }
  }

  if (removableIds.length > 0) {
    const { error: paymentError } = await supabase
      .from("payments")
      .delete()
      .in("id", removableIds);
    if (paymentError) {
      return {
        success: false,
        error:
          "ההרשמה בוטלה, אבל הסרת החיוב הפתוח נכשלה. אפשר להסיר אותו מעמוד הגבייה.",
      };
    }
  }

  await revalidateAfterEnrollmentChange();
  await revalidatePublicCatalog();
  return { success: true, warning: creditWarning };
}
