"use server";

import { requireRole } from "@/lib/auth";
import { isAppointmentClass } from "@/lib/classes/bookingMode";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";
import { chargeDescriptionForCheckout } from "@/lib/enrollment/receiptLabel";
import { revalidateAfterEnrollmentChange } from "@/lib/admin/enrollmentActions";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { syncEnrollmentPaymentStatus } from "@/lib/payments/splitParts";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import { createClient } from "@/lib/supabase/server";

export type TransferClassOption = {
  id: string;
  title: string;
  price: number;
  billingMonths: number | null;
  pickOneSlot: boolean;
  capacity: number | null;
  taken: number;
  slots: {
    id: string;
    label: string;
    price: number | null;
  }[];
};

export type TransferPreview = {
  enrollmentId: string;
  parentId: string;
  parentName: string;
  participantName: string;
  fromClassTitle: string;
  alreadyPaid: number;
  classes: TransferClassOption[];
};

export type TransferResult =
  | { success: true; extraCharged: number }
  | { success: false; error: string };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function loadTransferPreview(
  enrollmentId: string
): Promise<TransferPreview | null> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      "id, parent_id, child_id, class_id, status, children(full_name), classes(title), profiles(full_name), payments(amount, status)"
    )
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment || enrollment.status === "cancelled") return null;

  const alreadyPaid = round2(
    (enrollment.payments ?? [])
      .filter((payment) => payment.status === "paid" || payment.status === "partial")
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
  );

  const [{ data: classRows }, { data: slotRows }, { data: activeEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, price, billing_months, pick_one_slot, booking_mode, capacity, status, interest_only"
        )
        .eq("status", "active")
        .eq("interest_only", false)
        .order("title"),
      supabase
        .from("class_weekly_slots")
        .select("id, class_id, day_of_week, start_time, end_time, gender_policy, price"),
      supabase
        .from("enrollments")
        .select("id, class_id, status, payment_status, admin_assigned, payments(status, payment_method, external_reference, office_collection)")
        .neq("status", "cancelled"),
    ]);

  const slotsByClass = new Map<string, TransferClassOption["slots"]>();
  for (const slot of slotRows ?? []) {
    const list = slotsByClass.get(slot.class_id) ?? [];
    list.push({
      id: slot.id,
      label: formatWeeklySlotLabel(
        slot.day_of_week,
        slot.start_time,
        slot.end_time,
        slot.gender_policy
      ),
      price: slot.price,
    });
    slotsByClass.set(slot.class_id, list);
  }

  const takenByClass = new Map<string, number>();
  for (const row of activeEnrollments ?? []) {
    if (!row.class_id || !enrollmentHoldsSeat(row)) continue;
    takenByClass.set(row.class_id, (takenByClass.get(row.class_id) ?? 0) + 1);
  }

  const classes: TransferClassOption[] = (classRows ?? [])
    .filter((cls) => !isAppointmentClass(cls))
    .map((cls) => ({
      id: cls.id,
      title: cls.title,
      price: Number(cls.price),
      billingMonths: cls.billing_months,
      pickOneSlot: cls.pick_one_slot,
      capacity: cls.capacity,
      taken: takenByClass.get(cls.id) ?? 0,
      slots: slotsByClass.get(cls.id) ?? [],
    }));

  return {
    enrollmentId: enrollment.id,
    parentId: enrollment.parent_id,
    parentName: enrollment.profiles?.full_name ?? "לקוח",
    participantName:
      enrollment.children?.full_name ??
      enrollment.profiles?.full_name ??
      "מתאמן",
    fromClassTitle: enrollment.classes?.title ?? "חוג",
    alreadyPaid,
    classes,
  };
}

/**
 * מעביר הרשמה לחוג אחר.
 * אותו מחיר — בלי חיוב חדש. תוספת תשלום — חיוב פתוח חדש בגבייה.
 */
export async function transferEnrollment(input: {
  enrollmentId: string;
  toClassId: string;
  weeklySlotId?: string | null;
  extraAmount?: number | string | null;
}): Promise<TransferResult> {
  await requireRole("admin");
  const supabase = await createClient();

  const extra = round2(Math.max(0, Number(input.extraAmount) || 0));

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      "id, parent_id, child_id, class_id, weekly_slot_id, session_id, status, is_trial"
    )
    .eq("id", input.enrollmentId)
    .maybeSingle();

  if (!enrollment || enrollment.status === "cancelled") {
    return { success: false, error: "ההרשמה לא נמצאה." };
  }

  if (input.toClassId === enrollment.class_id) {
    return { success: false, error: "נא לבחור חוג אחר, לא את החוג הנוכחי." };
  }

  const { data: target } = await supabase
    .from("classes")
    .select(
      "id, title, price, billing_months, pick_one_slot, booking_mode, capacity, status, interest_only"
    )
    .eq("id", input.toClassId)
    .maybeSingle();

  if (!target || target.status !== "active") {
    return { success: false, error: "החוג שנבחר אינו זמין." };
  }
  if (target.interest_only) {
    return { success: false, error: "אי אפשר להחליף לחוג הרשמת עניין." };
  }
  if (isAppointmentClass(target)) {
    return {
      success: false,
      error: "אי אפשר להחליף לתור טיפול מכאן. שבצו מחדש למועד הספציפי.",
    };
  }

  let weeklySlotId: string | null = null;
  if (target.pick_one_slot) {
    if (!input.weeklySlotId) {
      return { success: false, error: "נא לבחור מועד בחוג החדש." };
    }
    const { data: slot } = await supabase
      .from("class_weekly_slots")
      .select("id")
      .eq("id", input.weeklySlotId)
      .eq("class_id", target.id)
      .maybeSingle();
    if (!slot) {
      return { success: false, error: "המועד שנבחר אינו שייך לחוג זה." };
    }
    weeklySlotId = slot.id;
  }

  const { data: existingInTarget } = await supabase
    .from("enrollments")
    .select(
      "id, child_id, status, payment_status, admin_assigned, payments(status, payment_method, external_reference, office_collection)"
    )
    .eq("class_id", target.id)
    .eq("parent_id", enrollment.parent_id)
    .neq("id", enrollment.id)
    .neq("status", "cancelled");

  const alreadyRegistered = (existingInTarget ?? []).some((row) => {
    if (!enrollmentHoldsSeat(row)) return false;
    if (enrollment.child_id) return row.child_id === enrollment.child_id;
    return !row.child_id;
  });
  if (alreadyRegistered) {
    return { success: false, error: "המתאמן כבר רשום לחוג הזה." };
  }

  const { error: updateError } = await supabase
    .from("enrollments")
    .update({
      class_id: target.id,
      weekly_slot_id: weeklySlotId,
      session_id: null,
      admin_assigned: true,
    })
    .eq("id", enrollment.id);

  if (updateError) {
    return { success: false, error: "ההחלפה נכשלה. נסו שוב." };
  }

  if (extra > 0) {
    const description = chargeDescriptionForCheckout({
      productTitle: `תוספת החלפה · ${target.title}`,
      participantCount: 1,
      kind: "class",
      customLabel: null,
    });

    const { error: paymentError } = await supabase.from("payments").insert({
      parent_id: enrollment.parent_id,
      enrollment_id: enrollment.id,
      amount: extra,
      payment_method: "bank_transfer",
      status: "pending",
      office_collection: true,
      receipt_description: description,
    });

    if (paymentError) {
      await supabase
        .from("enrollments")
        .update({
          class_id: enrollment.class_id,
          weekly_slot_id: enrollment.weekly_slot_id,
          session_id: enrollment.session_id,
        })
        .eq("id", enrollment.id);
      return {
        success: false,
        error: "ההחלפה לא נשמרה — יצירת חיוב התוספת נכשלה.",
      };
    }

    await syncEnrollmentPaymentStatus(supabase, enrollment.id);
  }

  await revalidateAfterEnrollmentChange();
  await revalidatePublicCatalog();
  return { success: true, extraCharged: extra };
}
