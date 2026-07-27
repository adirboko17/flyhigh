"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/integrations/payments";

export type CompleteEnrollmentResult =
  | { success: true; enrollmentIds: string[]; paymentReference: string }
  | { success: false; error: string };

export async function completeClassEnrollmentPayment(input: {
  classId: string;
  childIds: string[];
}): Promise<CompleteEnrollmentResult> {
  const profile = await requireRole("parent");
  const { classId, childIds } = input;

  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  if (uniqueChildIds.length === 0) {
    return { success: false, error: "נא לבחור לפחות ילד/ה אחד/ת." };
  }

  const supabase = await createClient();

  const [{ data: cls }, { data: children }, { data: existingEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, title, price, capacity, status")
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      supabase
        .from("children")
        .select("id, full_name")
        .eq("parent_id", profile.id)
        .in("id", uniqueChildIds),
      supabase
        .from("enrollments")
        .select("child_id")
        .eq("class_id", classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: "החוג לא נמצא או אינו זמין להרשמה." };
  }

  if (!children || children.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const alreadyEnrolled = new Set(
    (existingEnrollments ?? [])
      .map((e) => e.child_id)
      .filter(Boolean) as string[]
  );
  const duplicate = uniqueChildIds.find((id) => alreadyEnrolled.has(id));
  if (duplicate) {
    return { success: false, error: "אחד או יותר מהילדים כבר רשומים לחוג זה." };
  }

  const { count: takenCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("status", "active");

  const available = cls.capacity - (takenCount ?? 0);
  if (uniqueChildIds.length > available) {
    return {
      success: false,
      error:
        available <= 0
          ? "אין מקומות פנויים בחוג."
          : `נותרו רק ${available} מקומות פנויים בחוג.`,
    };
  }

  const unitPrice = Number(cls.price);
  const totalAmount = unitPrice * uniqueChildIds.length;

  const paymentProvider = getPaymentProvider();
  const charge = await paymentProvider.createCharge({
    amount: totalAmount,
    description: `הרשמה ל${cls.title} (${uniqueChildIds.length} ילדים)`,
    parentId: profile.id,
    method: "credit_card",
    metadata: { classId, childIds: uniqueChildIds },
  });

  if (!charge.success) {
    return { success: false, error: "התשלום נכשל. נסו שוב." };
  }

  const paidAt = new Date().toISOString();
  const enrollmentRows = uniqueChildIds.map((childId) => ({
    parent_id: profile.id,
    child_id: childId,
    class_id: classId,
    type: "class" as const,
    status: "active" as const,
    payment_status: "paid" as const,
  }));

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id");

  if (enrollmentError || !createdEnrollments?.length) {
    return { success: false, error: "לא הצלחנו לשמור את ההרשמות. נסו שוב." };
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    parent_id: profile.id,
    enrollment_id: createdEnrollments[0]?.id ?? null,
    amount: totalAmount,
    payment_method: "credit_card",
    status: "paid",
    paid_at: paidAt,
    external_reference: charge.reference,
  });

  if (paymentError) {
    return {
      success: false,
      error: "ההרשמות נוצרו אך שמירת התשלום נכשלה. פנו לצוות.",
    };
  }

  return {
    success: true,
    enrollmentIds: createdEnrollments.map((e) => e.id),
    paymentReference: charge.reference,
  };
}

export async function joinClassWaitlist(input: {
  classId: string;
  childIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole("parent");
  const uniqueChildIds = [...new Set(input.childIds.filter(Boolean))];

  if (uniqueChildIds.length === 0) {
    return { success: false, error: "נא לבחור לפחות ילד/ה אחד/ת." };
  }

  const supabase = await createClient();

  const [{ data: children }, { data: existingWaitlist }] = await Promise.all([
    supabase
      .from("children")
      .select("id")
      .eq("parent_id", profile.id)
      .in("id", uniqueChildIds),
    supabase
      .from("waitlist")
      .select("child_id")
      .eq("class_id", input.classId)
      .eq("parent_id", profile.id)
      .neq("status", "cancelled"),
  ]);

  if (!children || children.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const alreadyWaitlisted = new Set(
    (existingWaitlist ?? [])
      .map((w) => w.child_id)
      .filter(Boolean) as string[]
  );
  const toAdd = uniqueChildIds.filter((id) => !alreadyWaitlisted.has(id));

  if (toAdd.length === 0) {
    return { success: false, error: "כל הילדים שנבחרו כבר ברשימת המתנה." };
  }

  const { error } = await supabase.from("waitlist").insert(
    toAdd.map((childId) => ({
      parent_id: profile.id,
      child_id: childId,
      class_id: input.classId,
      status: "waiting" as const,
    }))
  );

  if (error) {
    return { success: false, error: "לא הצלחנו לשמור את רשימת המתנה. נסו שוב." };
  }

  return { success: true };
}
