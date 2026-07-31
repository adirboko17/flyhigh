"use server";

import { requireRole } from "@/lib/auth";
import {
  DEFERRED_PAYMENT_METHODS,
  isDeferredPaymentMethod,
  type DeferredPaymentMethod,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCouponCode,
  normalizeCouponCode,
  type AppliedCoupon,
} from "@/lib/finance/coupon";
import {
  calculateOrderTotal,
  parseSiblingTiers,
  splitAmount,
} from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { validateParticipantsAge } from "@/lib/enrollment/ageValidation";

/** אמצעי התשלום שאפשר לבחור במסך ההרשמה. */
export type CheckoutPaymentMethod = "credit_card" | DeferredPaymentMethod;

const ALLOWED_CHECKOUT_METHODS: readonly CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

export type CompleteEnrollmentResult =
  | {
      success: true;
      enrollmentIds: string[];
      /** אסמכתת סליקה — קיימת רק בתשלום מיידי בכרטיס אשראי. */
      paymentReference: string | null;
      /** תשלום שנגבה מול המשרד ונרשם כחוב פתוח בעמוד הגבייה. */
      deferred: boolean;
      /** הסכום שחויב בפועל ואחוז הנחת האחים שניתן. */
      total: number;
      discountPercent: number;
      /** הקופון שמומש בהרשמה, אם הוזן. */
      couponCode: string | null;
      couponDiscount: number;
    }
  | { success: false; error: string };

export type CouponPreviewResult =
  | { success: true; coupon: AppliedCoupon }
  | { success: false; error: string };

/**
 * בדיקת קוד קופון לפני התשלום. הסכום מחושב כאן ולא מתקבל מהדפדפן,
 * כדי שלא ניתן יהיה לנפח את ההנחה.
 */
export async function previewClassCoupon(input: {
  code: string;
  classId: string;
  childIds: string[];
}): Promise<CouponPreviewResult> {
  const profile = await requireRole("parent");
  const code = normalizeCouponCode(input.code);

  if (!isValidCouponCode(code)) {
    return { success: false, error: "נא להזין קוד קופון תקין." };
  }

  const uniqueChildIds = [...new Set(input.childIds.filter(Boolean))];
  if (uniqueChildIds.length === 0) {
    return { success: false, error: "נא לבחור לפחות ילד/ה אחד/ת." };
  }

  const supabase = await createClient();
  const subtotal = await classSubtotal(
    supabase,
    profile.id,
    input.classId,
    uniqueChildIds.length
  );

  if (subtotal === null) {
    return { success: false, error: "החוג לא נמצא או אינו זמין להרשמה." };
  }

  const { data, error } = await supabase.rpc("preview_coupon", {
    p_code: code,
    p_class_id: input.classId,
    p_amount: subtotal,
  });

  const result = data?.[0];

  if (error || !result) {
    return { success: false, error: "בדיקת הקופון נכשלה. נסו שוב." };
  }

  if (result.error) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    coupon: {
      code: result.code ?? code,
      discountType: result.discount_type ?? "fixed",
      discountValue: Number(result.discount_value ?? 0),
      discountAmount: Number(result.discount_amount ?? 0),
    },
  };
}

/** סכום ההזמנה אחרי הנחת אחים — הבסיס שעליו חל הקופון. */
async function classSubtotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  classId: string,
  childCount: number
): Promise<number | null> {
  const [{ data: cls }, { data: existingEnrollments }, { data: tiersJson }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("price")
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      supabase
        .from("enrollments")
        .select("child_id")
        .eq("class_id", classId)
        .eq("parent_id", parentId)
        .neq("status", "cancelled"),
      supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
    ]);

  if (!cls) return null;

  return calculateOrderTotal(
    Number(cls.price),
    childCount,
    parseSiblingTiers(tiersJson),
    (existingEnrollments?.length ?? 0) + childCount
  ).total;
}

export async function completeClassEnrollmentPayment(input: {
  classId: string;
  childIds: string[];
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string | null;
}): Promise<CompleteEnrollmentResult> {
  const profile = await requireRole("parent");
  const { classId, childIds, paymentMethod } = input;

  if (!ALLOWED_CHECKOUT_METHODS.includes(paymentMethod)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו נתמך." };
  }

  const deferred = isDeferredPaymentMethod(paymentMethod);

  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  if (uniqueChildIds.length === 0) {
    return { success: false, error: "נא לבחור לפחות ילד/ה אחד/ת." };
  }

  const supabase = await createClient();

  const [{ data: cls }, { data: children }, { data: existingEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, title, price, capacity, status, age_min, age_max")
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      supabase
        .from("children")
        .select("id, full_name, birth_date")
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

  const ageError = validateParticipantsAge(
    children.map((child) => ({
      name: child.full_name,
      birthDate: child.birth_date,
    })),
    cls.age_min,
    cls.age_max
  );
  if (ageError) {
    return { success: false, error: ageError };
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
    .in("status", ["active", "pending"]);

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

  // הנחת אחים נקבעת לפי כל האחים הרשומים לחוג — גם כאלה שנרשמו בהרשמה קודמת —
  // אך חלה רק על ההזמנה הנוכחית.
  const { data: tiersJson } = await supabase.rpc("class_sibling_discount_tiers", {
    p_class_id: classId,
  });

  const unitPrice = Number(cls.price);
  const order = calculateOrderTotal(
    unitPrice,
    uniqueChildIds.length,
    parseSiblingTiers(tiersJson),
    alreadyEnrolled.size + uniqueChildIds.length
  );

  // הקופון נתפס לפני החיוב, כדי שלא נגבה כסף על הנחה שכבר מוצתה.
  const requestedCode = input.couponCode
    ? normalizeCouponCode(input.couponCode)
    : null;
  let redemptionId: string | null = null;
  let couponCode: string | null = null;
  let couponDiscount = 0;

  if (requestedCode) {
    const { data: claimData, error: claimError } = await supabase.rpc(
      "claim_coupon",
      { p_code: requestedCode, p_class_id: classId, p_amount: order.total }
    );

    const claim = claimData?.[0];

    if (claimError || !claim) {
      return { success: false, error: "מימוש הקופון נכשל. נסו שוב." };
    }

    if (claim.error) {
      return { success: false, error: claim.error };
    }

    redemptionId = claim.redemption_id;
    couponCode = claim.code;
    couponDiscount = Number(claim.discount_amount ?? 0);
  }

  /** מבטל את תפיסת הקופון כשההרשמה לא הושלמה, כדי שלא תישרף מכסת השימושים. */
  async function releaseCoupon() {
    if (redemptionId) {
      await supabase.rpc("release_coupon", { p_redemption_id: redemptionId });
    }
  }

  const totalAmount = Math.round((order.total - couponDiscount) * 100) / 100;
  const childAmounts = splitAmount(totalAmount, uniqueChildIds.length);
  const amountPerChild = new Map(
    uniqueChildIds.map((childId, index) => [childId, childAmounts[index]])
  );

  // תשלום נדחה (מזומן, העברה, מכבי, עמית) נגבה מול המשרד ולכן לא עובר סליקה.
  // גם הזמנה שהקופון מאפס אותה לא עוברת סליקה.
  let paymentReference: string | null = null;

  if (!deferred && totalAmount > 0) {
    const charge = await getPaymentProvider().createCharge({
      amount: totalAmount,
      description: `הרשמה ל${cls.title} (${uniqueChildIds.length} ילדים)`,
      parentId: profile.id,
      method: paymentMethod,
      metadata: { classId, childIds: uniqueChildIds },
    });

    if (!charge.success) {
      await releaseCoupon();
      return { success: false, error: "התשלום נכשל. נסו שוב." };
    }

    paymentReference = charge.reference;
  }

  const paidAt = new Date().toISOString();
  const enrollmentRows = uniqueChildIds.map((childId) => ({
    parent_id: profile.id,
    child_id: childId,
    class_id: classId,
    type: "class" as const,
    status: "active" as const,
    payment_status: deferred ? ("unpaid" as const) : ("paid" as const),
    discount_percent: order.percent,
  }));

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id, child_id");

  if (enrollmentError || !createdEnrollments?.length) {
    await releaseCoupon();
    return { success: false, error: "לא הצלחנו לשמור את ההרשמות. נסו שוב." };
  }

  if (redemptionId) {
    await supabase.rpc("link_coupon_redemption", {
      p_redemption_id: redemptionId,
      p_enrollment_id: createdEnrollments[0].id,
    });
  }

  // חיוב נפרד לכל ילד/ה, כדי שברשימת הגבייה יהיה ברור על מה בדיוק החוב.
  const { error: paymentError } = await supabase.from("payments").insert(
    createdEnrollments.map((enrollment) => ({
      parent_id: profile.id,
      enrollment_id: enrollment.id,
      amount:
        (enrollment.child_id ? amountPerChild.get(enrollment.child_id) : null) ??
        unitPrice,
      payment_method: paymentMethod,
      status: deferred ? ("pending" as const) : ("paid" as const),
      paid_at: deferred ? null : paidAt,
      external_reference: paymentReference,
    }))
  );

  if (paymentError) {
    return {
      success: false,
      error: "ההרשמות נוצרו אך שמירת התשלום נכשלה. פנו לצוות.",
    };
  }

  return {
    success: true,
    enrollmentIds: createdEnrollments.map((e) => e.id),
    paymentReference,
    deferred,
    total: totalAmount,
    discountPercent: order.percent,
    couponCode,
    couponDiscount,
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

  const [{ data: cls }, { data: children }, { data: existingWaitlist }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("age_min, age_max")
        .eq("id", input.classId)
        .maybeSingle(),
      supabase
        .from("children")
        .select("id, full_name, birth_date")
        .eq("parent_id", profile.id)
        .in("id", uniqueChildIds),
      supabase
        .from("waitlist")
        .select("child_id")
        .eq("class_id", input.classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: "החוג לא נמצא." };
  }

  if (!children || children.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const ageError = validateParticipantsAge(
    children.map((child) => ({
      name: child.full_name,
      birthDate: child.birth_date,
    })),
    cls.age_min,
    cls.age_max
  );
  if (ageError) {
    return { success: false, error: ageError };
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
