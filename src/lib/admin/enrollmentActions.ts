"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  planClassCancellationRefund,
  proratedRefundAmount,
} from "@/lib/finance/cancellationRefund";
import { paymentHasRecordedMoney, type RecordedMoneyPayment } from "@/lib/payments/recordedMoney";
import { israelDateOf, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export type AdminEnrollmentActionResult =
  | { success: true }
  | { success: false; error: string };

export async function revalidateAfterEnrollmentChange() {
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/collections");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/refunds");
  revalidatePath("/parent/dashboard");
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

type LinkedPayment = {
  id: string;
  amount: number;
  parent_id: string;
  status: RecordedMoneyPayment["status"];
  payment_method: RecordedMoneyPayment["payment_method"];
  external_reference: string | null;
  office_collection: boolean | null;
  payment_receipts: { id: string; amount: number }[] | null;
  payment_refunds: { id: string; amount: number }[] | null;
};

function refundableCollected(payment: LinkedPayment): number {
  const receipts = payment.payment_receipts ?? [];
  const collected =
    receipts.length > 0
      ? receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0)
      : payment.status === "paid" ||
          payment.status === "partial" ||
          payment.status === "refunded"
        ? Number(payment.amount)
        : 0;
  const refunded = (payment.payment_refunds ?? []).reduce(
    (sum, refund) => sum + Number(refund.amount),
    0
  );
  return round2(Math.max(0, collected - refunded));
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

async function queuePaidCancellationRefunds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    enrollmentId: string;
    parentId: string;
    type: string;
    classId: string | null;
    weeklySlotId: string | null;
    sessionId: string | null;
    joinedAt: string;
    payments: LinkedPayment[];
    createdBy: string;
  }
) {
  const refundable = input.payments.filter(
    (payment) => refundableCollected(payment) > 0
  );
  if (refundable.length === 0) return;

  let remainingAtJoin = 0;
  let remainingNow = 0;
  let useRatio = false;
  let note = "הסרה · זיכוי מלא";

  if (input.type === "class" && input.classId) {
    let sessionQuery = supabase
      .from("class_sessions")
      .select("id, session_date, start_time, status, weekly_slot_id")
      .eq("class_id", input.classId);
    if (input.sessionId) {
      sessionQuery = sessionQuery.eq("id", input.sessionId);
    } else if (input.weeklySlotId) {
      sessionQuery = sessionQuery.eq("weekly_slot_id", input.weeklySlotId);
    }
    const { data: sessions } = await sessionQuery;
    const plan = planClassCancellationRefund({
      paidRemaining: 1,
      sessions: sessions ?? [],
      joinedOn: israelDateOf(input.joinedAt),
      today: todayInIsrael(),
    });
    if (!plan) return;
    remainingAtJoin = plan.remainingAtJoin;
    remainingNow = plan.remainingNow;
    useRatio = plan.billableCount > 0;
    note = plan.note;
  }

  for (const payment of refundable) {
    const paidRemaining = refundableCollected(payment);
    const amount = useRatio
      ? proratedRefundAmount({
          paidRemaining,
          remainingAtJoin,
          remainingNow,
        })
      : paidRemaining;
    if (amount <= 0) continue;

    await supabase.from("pending_refunds").upsert(
      {
        payment_id: payment.id,
        enrollment_id: input.enrollmentId,
        parent_id: input.parentId,
        amount,
        note,
        created_by: input.createdBy,
      },
      { onConflict: "payment_id", ignoreDuplicates: true }
    );
  }
}

/**
 * ביטול הרשמה מממשק הניהול.
 * מסיר מהחוג/המוצר, מבטל תורים מקושרים, ומוחק חיוב פתוח בלי תקבולים.
 * לקוח שכבר שילם נכנס לזיכויים בהמתנה (זיכוי יחסי לפי מפגשים שנותרו).
 */
export async function cancelAdminEnrollment(
  enrollmentId: string
): Promise<AdminEnrollmentActionResult> {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      "id, status, type, class_id, parent_id, created_at, weekly_slot_id, session_id"
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "ההרשמה לא נמצאה." };
  }

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, status, parent_id, payment_method, external_reference, office_collection, payment_receipts(id, amount), payment_refunds(id, amount)"
    )
    .eq("enrollment_id", enrollment.id);

  const paymentRows = (payments ?? []) as LinkedPayment[];
  const paymentIds = paymentRows.map((payment) => payment.id);
  const documentsByPayment = new Map<string, string[]>();

  if (paymentIds.length > 0) {
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
  }

  const removableIds = paymentRows
    .filter(
      (payment) =>
        !paymentHasRecordedMoney({
          ...payment,
          documentIds: documentsByPayment.get(payment.id),
        })
    )
    .map((payment) => payment.id);
  const removable = new Set(removableIds);
  const keptPayments = paymentRows.filter((payment) => !removable.has(payment.id));

  await cancelLinkedBookings(supabase, enrollment.id);

  if (enrollment.status !== "cancelled") {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: "cancelled" })
      .eq("id", enrollment.id);
    if (error) {
      return { success: false, error: "ביטול ההרשמה נכשל. נסו שוב." };
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

  await queuePaidCancellationRefunds(supabase, {
    enrollmentId: enrollment.id,
    parentId: enrollment.parent_id,
    type: enrollment.type,
    classId: enrollment.class_id,
    weeklySlotId: enrollment.weekly_slot_id,
    sessionId: enrollment.session_id,
    joinedAt: enrollment.created_at,
    payments: keptPayments,
    createdBy: profile.id,
  });

  await revalidateAfterEnrollmentChange();
  await revalidatePublicCatalog();
  return { success: true };
}
