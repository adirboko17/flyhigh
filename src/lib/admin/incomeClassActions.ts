"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { canAssignIncomeClass } from "@/lib/finance/subject";
import { createClient } from "@/lib/supabase/server";

const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidateMoney() {
  revalidatePath("/admin/collections");
  revalidatePath("/admin/buyers");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/reports");
}

async function classExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string | null
): Promise<{ ok: true; classId: string | null } | { ok: false; error: string }> {
  if (!classId) return { ok: true, classId: null };
  if (!ID.test(classId)) return { ok: false, error: "החוג לא נמצא." };

  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "החוג לא נמצא." };
  return { ok: true, classId: data.id };
}

export async function assignPaymentIncomeClass(input: {
  paymentId: string;
  classId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");
  if (!ID.test(input.paymentId)) {
    return { success: false, error: "החיוב לא נמצא." };
  }

  const supabase = await createClient();
  const chosen = await classExists(supabase, input.classId);
  if (!chosen.ok) return { success: false, error: chosen.error };

  const { data: payment, error: loadError } = await supabase
    .from("payments")
    .select("id, enrollments(type)")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (loadError || !payment) {
    return { success: false, error: "החיוב לא נמצא." };
  }

  const enrollment = payment.enrollments;
  if (!canAssignIncomeClass(enrollment?.type ?? null)) {
    return { success: false, error: "אפשר לשייך לחוג רק תשלום של כרטיסייה או מנוי." };
  }

  const { error } = await supabase
    .from("payments")
    .update({ income_class_id: chosen.classId })
    .eq("id", payment.id);

  if (error) {
    return { success: false, error: "שמירת השיוך לחוג נכשלה. נסו שוב." };
  }

  revalidateMoney();
  return { success: true };
}

export async function assignEnrollmentIncomeClass(input: {
  enrollmentId: string;
  classId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");
  if (!ID.test(input.enrollmentId)) {
    return { success: false, error: "הרכישה לא נמצאה." };
  }

  const supabase = await createClient();
  const chosen = await classExists(supabase, input.classId);
  if (!chosen.ok) return { success: false, error: chosen.error };

  const { data: enrollment, error: loadError } = await supabase
    .from("enrollments")
    .select("id, type")
    .eq("id", input.enrollmentId)
    .maybeSingle();

  if (loadError || !enrollment) {
    return { success: false, error: "הרכישה לא נמצאה." };
  }

  if (!canAssignIncomeClass(enrollment.type)) {
    return { success: false, error: "אפשר לשייך לחוג רק כרטיסייה או מנוי." };
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("id")
    .eq("enrollment_id", enrollment.id);

  if (paymentsError) {
    return { success: false, error: "טעינת החיובים נכשלה. נסו שוב." };
  }

  if (!payments?.length) {
    return { success: false, error: "אין חיוב מקושר לרכישה הזו." };
  }

  const { error } = await supabase
    .from("payments")
    .update({ income_class_id: chosen.classId })
    .eq("enrollment_id", enrollment.id);

  if (error) {
    return { success: false, error: "שמירת השיוך לחוג נכשלה. נסו שוב." };
  }

  revalidateMoney();
  return { success: true };
}
