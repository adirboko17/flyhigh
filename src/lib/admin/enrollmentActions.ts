"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  paymentHasRecordedMoney,
  type RecordedMoneyPayment,
} from "@/lib/payments/recordedMoney";
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
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/refunds");
  revalidatePath("/parent/dashboard");
}

type LinkedPayment = RecordedMoneyPayment & {
  payment_receipts: { id: string; amount: number }[] | null;
};

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

/**
 * ביטול הרשמה מממשק הניהול.
 * מסיר מהחוג/המוצר, מבטל תורים מקושרים, ומוחק חיוב פתוח בלי תקבולים.
 * תשלום שכבר נגבה נשאר בתיעוד — זיכוי רק מעמוד הזיכויים.
 */
export async function cancelAdminEnrollment(
  enrollmentId: string
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

  await revalidateAfterEnrollmentChange();
  await revalidatePublicCatalog();
  return { success: true };
}
