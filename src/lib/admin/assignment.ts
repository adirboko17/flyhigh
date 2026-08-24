"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  DEFERRED_PAYMENT_METHODS,
  type DeferredPaymentMethod,
} from "@/lib/constants";
import { classInstallmentOptions } from "@/lib/finance/classPricing";
import { splitAmount } from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
import {
  declarationSchoolYear,
  healthDeclarationErrorFor,
  missingHealthDeclarationChildren,
} from "@/lib/health-declaration";
import { createClient } from "@/lib/supabase/server";

/** "none" — שיבוץ בלי ליצור חיוב. "credit_card" — דף סליקה של קארדקום. */
export type AssignChargeMethod = DeferredPaymentMethod | "credit_card" | "none";

export type AssignResult =
  | {
      success: true;
      assigned: number;
      overCapacity: boolean;
      checkoutUrl: string | null;
    }
  | { success: false; error: string };

type AssignCore = {
  classId: string;
  parentId: string;
  childIds: string[];
  /** סכום כולל לכל הילדים שנבחרו. */
  amount: number;
  method: AssignChargeMethod;
  markPaid: boolean;
  weeklySlotId?: string | null;
};

function isAllowedMethod(value: string): value is AssignChargeMethod {
  return (
    value === "none" ||
    value === "credit_card" ||
    (DEFERRED_PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * שיבוץ ידני של ילדים לחוג מממשק הניהול. מותר גם מעבר לתפוסה — המנהל רואה
 * אזהרה מראש, והטריגר במסד הנתונים מסמן את החוג כמלא.
 */
export async function assignChildrenToClass(
  input: AssignCore
): Promise<AssignResult> {
  await requireRole("admin");
  return runAssignment(input);
}

/** שיבוץ ממתין מרשימת ההמתנה; פרטי הילד וההורה נלקחים מהרשומה עצמה. */
export async function assignWaitlistEntry(input: {
  waitlistId: string;
  amount: number;
  method: AssignChargeMethod;
  markPaid: boolean;
}): Promise<AssignResult> {
  await requireRole("admin");

  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("waitlist")
    .select("id, class_id, child_id, parent_id, status, weekly_slot_id")
    .eq("id", input.waitlistId)
    .maybeSingle();

  if (!entry || !entry.class_id) {
    return { success: false, error: "רשומת ההמתנה לא נמצאה." };
  }

  if (!entry.child_id) {
    return { success: false, error: "לרשומת ההמתנה לא משויך ילד/ה." };
  }

  if (entry.status === "joined") {
    return { success: false, error: "הילד/ה כבר שובץ/ה לחוג הזה." };
  }

  return runAssignment({
    classId: entry.class_id,
    parentId: entry.parent_id,
    childIds: [entry.child_id],
    amount: input.amount,
    method: input.method,
    markPaid: input.markPaid,
    weeklySlotId: entry.weekly_slot_id,
  });
}

async function runAssignment(input: AssignCore): Promise<AssignResult> {
  if (!isAllowedMethod(input.method)) {
    return { success: false, error: "אמצעי תשלום לא נתמך." };
  }

  const childIds = [...new Set(input.childIds.filter(Boolean))];
  if (childIds.length === 0) {
    return { success: false, error: "נא לבחור לפחות ילד/ה אחד/ת." };
  }

  const total = round2(Math.max(0, Number(input.amount) || 0));
  const supabase = await createClient();

  const [{ data: cls }, { data: children }, { data: existing }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, capacity, title, billing_months, pick_one_slot")
        .eq("id", input.classId)
        .maybeSingle(),
      // אימות שהילדים באמת שייכים ללקוח שנבחר, ולא נשלחו מהדפדפן.
      supabase
        .from("children")
        .select("id, full_name")
        .eq("parent_id", input.parentId)
        .in("id", childIds),
      supabase
        .from("enrollments")
        .select("child_id, children(full_name)")
        .eq("class_id", input.classId)
        .in("child_id", childIds)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: "החוג לא נמצא." };
  }

  let weeklySlotId: string | null = input.weeklySlotId ?? null;
  if (cls.pick_one_slot) {
    if (!weeklySlotId) {
      return { success: false, error: "נא לבחור מועד לשיבוץ." };
    }
    const { data: slot } = await supabase
      .from("class_weekly_slots")
      .select("id")
      .eq("id", weeklySlotId)
      .eq("class_id", input.classId)
      .maybeSingle();
    if (!slot) {
      return { success: false, error: "המועד שנבחר אינו שייך לחוג זה." };
    }
    weeklySlotId = slot.id;
  } else {
    weeklySlotId = null;
  }

  if (!children || children.length !== childIds.length) {
    return { success: false, error: "חלק מהילדים אינם משויכים ללקוח שנבחר." };
  }

  const { data: declarations } = await supabase
    .from("health_declarations")
    .select("child_id")
    .eq("parent_id", input.parentId)
    .eq("school_year", declarationSchoolYear())
    .in("child_id", childIds);
  const missingHealth = missingHealthDeclarationChildren(
    children,
    (declarations ?? []).map((row) => row.child_id)
  );
  if (missingHealth.length > 0) {
    return {
      success: false,
      error: healthDeclarationErrorFor(
        missingHealth.map((child) => child.full_name)
      ),
    };
  }

  if (existing && existing.length > 0) {
    const names = existing
      .map((row) => row.children?.full_name)
      .filter(Boolean)
      .join(", ");
    return {
      success: false,
      error: names
        ? `${names} כבר רשומים לחוג הזה.`
        : "חלק מהילדים כבר רשומים לחוג הזה.",
    };
  }

  const { count: takenBefore } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", input.classId)
    .in("status", ["active", "pending"]);

  const isCreditCard = input.method === "credit_card";
  const awaitingCardcom = isCreditCard && total > 0;
  const settledNow = input.markPaid && !awaitingCardcom;

  const { data: created, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(
      childIds.map((childId) => ({
        parent_id: input.parentId,
        child_id: childId,
        class_id: input.classId,
        weekly_slot_id: weeklySlotId,
        type: "class" as const,
        status: "active" as const,
        payment_status: settledNow ? ("paid" as const) : ("unpaid" as const),
        admin_assigned: true,
      }))
    )
    .select("id, child_id");

  if (enrollmentError || !created || created.length === 0) {
    return { success: false, error: "יצירת ההרשמות נכשלה. נסו שוב." };
  }

  let checkoutUrl: string | null = null;

  if (input.method !== "none" && total > 0) {
    const parts = splitAmount(total, created.length);
    const paidAt = settledNow ? new Date().toISOString() : null;

    const { data: createdPayments, error: paymentError } = await supabase
      .from("payments")
      .insert(
        created.map((enrollment, index) => ({
          parent_id: input.parentId,
          enrollment_id: enrollment.id,
          amount: parts[index],
          payment_method: input.method as Exclude<AssignChargeMethod, "none">,
          status: settledNow ? ("paid" as const) : ("pending" as const),
          paid_at: paidAt,
        }))
      )
      .select("id");

    if (paymentError || !createdPayments?.length) {
      await supabase
        .from("enrollments")
        .delete()
        .in(
          "id",
          created.map((enrollment) => enrollment.id)
        );
      return { success: false, error: "יצירת החיוב נכשלה. נסו שוב." };
    }

    if (awaitingCardcom) {
      const charge = await getPaymentProvider().createCharge({
        amount: total,
        description: `שיבוץ ל${cls.title} (${created.length} ${created.length === 1 ? "ילד/ה" : "ילדים"})`,
        parentId: input.parentId,
        method: "credit_card",
        paymentIds: createdPayments.map((payment) => payment.id),
        metadata: {
          classId: input.classId,
          childIds,
          adminAssigned: true,
        },
        installments: classInstallmentOptions(cls.billing_months),
      });

      if (!charge.success || !charge.redirectUrl) {
        await supabase
          .from("payments")
          .delete()
          .in(
            "id",
            createdPayments.map((payment) => payment.id)
          );
        await supabase
          .from("enrollments")
          .delete()
          .in(
            "id",
            created.map((enrollment) => enrollment.id)
          );
        return {
          success: false,
          error: charge.error || "לא הצלחנו לפתוח את דף התשלום. נסו שוב.",
        };
      }

      checkoutUrl = charge.redirectUrl;
    }
  }

  // מי שהיה ברשימת ההמתנה לחוג כבר לא ממתין.
  await supabase
    .from("waitlist")
    .update({ status: "joined" })
    .eq("class_id", input.classId)
    .in("child_id", childIds)
    .in("status", ["waiting", "offered"]);

  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/collections");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/customers");

  if (
    input.method !== "none" &&
    !awaitingCardcom &&
    !settledNow &&
    total > 0
  ) {
    const { data: parent } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", input.parentId)
      .maybeSingle();

    await notifyAdminPayment({
      paid: false,
      parentName: parent?.full_name || "לקוח",
      phone: parent?.phone,
      email: parent?.email,
      product: `שיבוץ ל${cls.title}`,
      amount: total,
      paymentMethod: input.method,
      participants: children.map((child) => child.full_name),
    });
  }

  return {
    success: true,
    assigned: created.length,
    overCapacity: (takenBefore ?? 0) + created.length > cls.capacity,
    checkoutUrl,
  };
}
