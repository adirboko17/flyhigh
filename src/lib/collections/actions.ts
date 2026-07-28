"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { DEFERRED_PAYMENT_METHODS, isDeferredPaymentMethod } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type CollectionActionResult = { success: true } | { success: false; error: string };

const NOT_ALLOWED: CollectionActionResult = {
  success: false,
  error: "אין לך הרשאה לבצע פעולה זו.",
};

async function isCallerAdmin() {
  const profile = await getSessionProfile();
  return profile?.role === "admin";
}

/**
 * מסמן חיוב כשולם או מחזיר אותו לחוב פתוח, ומסנכרן את סטטוס התשלום של ההרשמה.
 */
export async function setChargePaid(input: {
  paymentId: string;
  paid: boolean;
}): Promise<CollectionActionResult> {
  if (!(await isCallerAdmin())) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: charge } = await supabase
    .from("payments")
    .select("id, enrollment_id, payment_method")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (!charge) {
    return { success: false, error: "החיוב לא נמצא." };
  }
  if (!isDeferredPaymentMethod(charge.payment_method)) {
    return { success: false, error: "חיוב זה אינו מנוהל דרך רשימת הגבייה." };
  }

  const { error: paymentError } = await supabase
    .from("payments")
    .update({
      status: input.paid ? "paid" : "pending",
      paid_at: input.paid ? new Date().toISOString() : null,
    })
    .eq("id", charge.id);

  if (paymentError) {
    return { success: false, error: "עדכון החיוב נכשל. נסו שוב." };
  }

  if (charge.enrollment_id) {
    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .update({ payment_status: input.paid ? "paid" : "unpaid" })
      .eq("id", charge.enrollment_id);

    if (enrollmentError) {
      return {
        success: false,
        error: "החיוב עודכן אך סטטוס ההרשמה לא התעדכן. רעננו ונסו שוב.",
      };
    }
  }

  revalidatePath("/admin/collections");
  return { success: true };
}

/** מסמן את כל החובות הפתוחים של הורה מסוים כשולמו — לסגירת חשבון בפעולה אחת. */
export async function settleParentCharges(input: {
  parentId: string;
}): Promise<CollectionActionResult> {
  if (!(await isCallerAdmin())) return NOT_ALLOWED;

  const supabase = await createClient();
  const { data: openCharges } = await supabase
    .from("payments")
    .select("id, enrollment_id")
    .eq("parent_id", input.parentId)
    .eq("status", "pending")
    .in("payment_method", [...DEFERRED_PAYMENT_METHODS]);

  if (!openCharges?.length) {
    return { success: false, error: "אין חובות פתוחים להורה זה." };
  }

  const paidAt = new Date().toISOString();
  const { error: paymentError } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: paidAt })
    .in(
      "id",
      openCharges.map((charge) => charge.id)
    );

  if (paymentError) {
    return { success: false, error: "עדכון החיובים נכשל. נסו שוב." };
  }

  const enrollmentIds = openCharges
    .map((charge) => charge.enrollment_id)
    .filter((id): id is string => id !== null);

  if (enrollmentIds.length > 0) {
    const { error: enrollmentError } = await supabase
      .from("enrollments")
      .update({ payment_status: "paid" })
      .in("id", enrollmentIds);

    if (enrollmentError) {
      return {
        success: false,
        error: "החיובים עודכנו אך סטטוס ההרשמות לא התעדכן. רעננו ונסו שוב.",
      };
    }
  }

  revalidatePath("/admin/collections");
  return { success: true };
}
