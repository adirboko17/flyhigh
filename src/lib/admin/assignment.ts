"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  DEFERRED_PAYMENT_METHODS,
  type DeferredPaymentMethod,
} from "@/lib/constants";
import { splitAmount } from "@/lib/finance/siblingDiscount";
import { createClient } from "@/lib/supabase/server";

/** "none" — שיבוץ בלי ליצור חיוב בעמוד הגבייה. */
export type AssignChargeMethod = DeferredPaymentMethod | "none";

export type AssignResult =
  | { success: true; assigned: number; overCapacity: boolean }
  | { success: false; error: string };

type AssignCore = {
  classId: string;
  parentId: string;
  childIds: string[];
  /** סכום כולל לכל הילדים שנבחרו. */
  amount: number;
  method: AssignChargeMethod;
  markPaid: boolean;
};

function isAllowedMethod(value: string): value is AssignChargeMethod {
  return (
    value === "none" ||
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
    .select("id, class_id, child_id, parent_id, status")
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
        .select("id, capacity")
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

  if (!children || children.length !== childIds.length) {
    return { success: false, error: "חלק מהילדים אינם משויכים ללקוח שנבחר." };
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

  const { data: created, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(
      childIds.map((childId) => ({
        parent_id: input.parentId,
        child_id: childId,
        class_id: input.classId,
        type: "class" as const,
        status: "active" as const,
        payment_status: input.markPaid ? ("paid" as const) : ("unpaid" as const),
        admin_assigned: true,
      }))
    )
    .select("id, child_id");

  if (enrollmentError || !created || created.length === 0) {
    return { success: false, error: "יצירת ההרשמות נכשלה. נסו שוב." };
  }

  if (input.method !== "none" && total > 0) {
    const parts = splitAmount(total, created.length);
    const paidAt = input.markPaid ? new Date().toISOString() : null;

    const { error: paymentError } = await supabase.from("payments").insert(
      created.map((enrollment, index) => ({
        parent_id: input.parentId,
        enrollment_id: enrollment.id,
        amount: parts[index],
        payment_method: input.method as DeferredPaymentMethod,
        status: input.markPaid ? ("paid" as const) : ("pending" as const),
        paid_at: paidAt,
      }))
    );

    if (paymentError) {
      // בלי החיוב ההרשמות היו נשארות בלי מעקב כספי, ולכן חוזרים אחורה.
      await supabase
        .from("enrollments")
        .delete()
        .in(
          "id",
          created.map((enrollment) => enrollment.id)
        );
      return { success: false, error: "יצירת החיוב נכשלה. נסו שוב." };
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

  return {
    success: true,
    assigned: created.length,
    overCapacity: (takenBefore ?? 0) + created.length > cls.capacity,
  };
}
