"use server";

import {
  childEligibilityError,
  type ClassAudienceFields,
} from "@/lib/class-audience";
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
  countFamilyChildrenInCategory,
  listFamilyChildrenInCategory,
} from "@/lib/enrollment/categorySiblings";
import { prorateClassPrice } from "@/lib/finance/proratedClassPrice";
import {
  calculateOrderTotal,
  parseSiblingTiers,
  splitSiblingAmounts,
} from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import {
  declarationSchoolYear,
  healthDeclarationErrorFor,
  missingHealthDeclarationChildren,
} from "@/lib/health-declaration";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import {
  chargeDescriptionForCheckout,
  resolveReceiptLabelForCheckout,
} from "@/lib/enrollment/receiptLabel";

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
      /** אסמכתת סליקה — קיימת אחרי פתיחת דף קארדקום או בתשלום שכבר הושלם. */
      paymentReference: string | null;
      /** דף הסליקה של קארדקום — כשיש סכום לתשלום בכרטיס. */
      checkoutUrl: string | null;
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
    uniqueChildIds
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

async function loadClassUnitPrice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  fullPrice: number
) {
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("session_date, start_time, status")
    .eq("class_id", classId);

  return prorateClassPrice(fullPrice, sessions ?? [], todayInIsrael());
}

/** סכום ההזמנה אחרי הנחת אחים — הבסיס שעליו חל הקופון. */
async function classSubtotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  classId: string,
  childIds: string[]
): Promise<number | null> {
  const [{ data: cls }, { data: tiersJson }] = await Promise.all([
    supabase
      .from("classes")
      .select("price, category")
      .eq("id", classId)
      .in("status", ["active", "full"])
      .maybeSingle(),
    supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
  ]);

  if (!cls) return null;

  const [proration, categorySiblingIds] = await Promise.all([
    loadClassUnitPrice(supabase, classId, Number(cls.price)),
    listFamilyChildrenInCategory(supabase, parentId, classId, cls.category),
  ]);
  if (proration.hasEnded) return null;

  const alreadyInCategory = countFamilyChildrenInCategory(
    categorySiblingIds,
    childIds
  );

  return calculateOrderTotal(
    proration.unitPrice,
    childIds.length,
    parseSiblingTiers(tiersJson),
    alreadyInCategory + childIds.length
  ).total;
}

export async function completeClassEnrollmentPayment(input: {
  classId: string;
  childIds: string[];
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string | null;
  /** תווית לקבלה — אם נבחרה, מחליפה את שם החוג בתיאור החיוב/הקבלה. */
  receiptLabelId?: string | null;
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
        .select(
          "id, title, price, category, capacity, status, gender_policy, audience_type, age_min, age_max, grade_min, grade_max"
        )
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      supabase
        .from("children")
        .select(
          "id, full_name, gender, birth_date, school_grade, grade_school_year"
        )
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

  const healthError = await requireHealthDeclarations(
    supabase,
    profile.id,
    children
  );
  if (healthError) return { success: false, error: healthError };

  const audience: ClassAudienceFields = {
    gender_policy: cls.gender_policy,
    audience_type: cls.audience_type,
    age_min: cls.age_min,
    age_max: cls.age_max,
    grade_min: cls.grade_min,
    grade_max: cls.grade_max,
  };
  for (const child of children) {
    const eligibilityError = childEligibilityError(audience, child);
    if (eligibilityError) {
      return { success: false, error: eligibilityError };
    }
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

  // הנחת אחים נקבעת לפי אחים רשומים לאותה קטגוריה — גם בחוג אחר —
  // וחלה רק על הילד השני ומעלה (לא על הילד הראשון במשפחה).
  const [{ data: tiersJson }, categorySiblingIds] = await Promise.all([
    supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
    listFamilyChildrenInCategory(
      supabase,
      profile.id,
      classId,
      cls.category
    ),
  ]);

  const proration = await loadClassUnitPrice(supabase, classId, Number(cls.price));
  if (proration.hasEnded) {
    return { success: false, error: "החוג כבר הסתיים ולא ניתן להירשם אליו." };
  }

  const unitPrice = proration.unitPrice;
  const alreadyEnrolledCount = countFamilyChildrenInCategory(
    categorySiblingIds,
    uniqueChildIds
  );
  const order = calculateOrderTotal(
    unitPrice,
    uniqueChildIds.length,
    parseSiblingTiers(tiersJson),
    alreadyEnrolledCount + uniqueChildIds.length
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
  const childAmounts = splitSiblingAmounts(
    unitPrice,
    uniqueChildIds.length,
    order.percent,
    alreadyEnrolledCount,
    totalAmount,
  );
  const amountPerChild = new Map(
    uniqueChildIds.map((childId, index) => [childId, childAmounts[index]])
  );

  const receiptLabel = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!receiptLabel.ok) {
    await releaseCoupon();
    return { success: false, error: receiptLabel.error };
  }

  const chargeDescription = chargeDescriptionForCheckout({
    productTitle: cls.title,
    participantCount: uniqueChildIds.length,
    kind: "class",
    customLabel: receiptLabel.description,
  });

  // תשלום נדחה נגבה מול המשרד. כרטיס אשראי נפתח כחוב עד שאישור קארדקום.
  // הזמנה שהקופון מאפס אותה לא עוברת סליקה.
  const awaitingCardcom = !deferred && totalAmount > 0;

  const paidAt = new Date().toISOString();
  const enrollmentRows = uniqueChildIds.map((childId, index) => {
    const paysFull =
      order.percent <= 0 || (alreadyEnrolledCount === 0 && index === 0);
    return {
      parent_id: profile.id,
      child_id: childId,
      class_id: classId,
      type: "class" as const,
      status: "active" as const,
      payment_status:
        deferred || awaitingCardcom ? ("unpaid" as const) : ("paid" as const),
      discount_percent: paysFull ? 0 : order.percent,
    };
  });

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
  const { data: createdPayments, error: paymentError } = await supabase
    .from("payments")
    .insert(
      createdEnrollments.map((enrollment) => ({
        parent_id: profile.id,
        enrollment_id: enrollment.id,
        amount:
          (enrollment.child_id ? amountPerChild.get(enrollment.child_id) : null) ??
          unitPrice,
        payment_method: paymentMethod,
        status: deferred || awaitingCardcom ? ("pending" as const) : ("paid" as const),
        paid_at: deferred || awaitingCardcom ? null : paidAt,
        receipt_label_id: receiptLabel.labelId,
        receipt_description: receiptLabel.description ?? chargeDescription,
      }))
    )
    .select("id");

  if (paymentError || !createdPayments?.length) {
    await supabase
      .from("enrollments")
      .delete()
      .in(
        "id",
        createdEnrollments.map((enrollment) => enrollment.id)
      );
    await releaseCoupon();
    return {
      success: false,
      error: "ההרשמות נוצרו אך שמירת התשלום נכשלה. פנו לצוות.",
    };
  }

  let paymentReference: string | null = null;
  let checkoutUrl: string | null = null;

  if (awaitingCardcom) {
    const charge = await getPaymentProvider().createCharge({
      amount: totalAmount,
      description: chargeDescription,
      parentId: profile.id,
      method: paymentMethod,
      paymentIds: createdPayments.map((payment) => payment.id),
      couponRedemptionId: redemptionId,
      metadata: { classId, childIds: uniqueChildIds },
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
          createdEnrollments.map((enrollment) => enrollment.id)
        );
      await releaseCoupon();
      return {
        success: false,
        error: charge.error || "לא הצלחנו לפתוח את דף התשלום. נסו שוב.",
      };
    }

    paymentReference = charge.reference;
    checkoutUrl = charge.redirectUrl;
  }

  return {
    success: true,
    enrollmentIds: createdEnrollments.map((e) => e.id),
    paymentReference,
    checkoutUrl,
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
        .select(
          "id, gender_policy, audience_type, age_min, age_max, grade_min, grade_max"
        )
        .eq("id", input.classId)
        .maybeSingle(),
      supabase
        .from("children")
        .select(
          "id, full_name, gender, birth_date, school_grade, grade_school_year"
        )
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

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("session_date, start_time, status")
    .eq("class_id", input.classId);
  const waitlistProration = prorateClassPrice(
    0,
    sessions ?? [],
    todayInIsrael()
  );
  if (waitlistProration.hasEnded) {
    return { success: false, error: "החוג כבר הסתיים ולא ניתן להצטרף לרשימת ההמתנה." };
  }

  if (!children || children.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const healthError = await requireHealthDeclarations(
    supabase,
    profile.id,
    children
  );
  if (healthError) return { success: false, error: healthError };

  const audience: ClassAudienceFields = {
    gender_policy: cls.gender_policy,
    audience_type: cls.audience_type,
    age_min: cls.age_min,
    age_max: cls.age_max,
    grade_min: cls.grade_min,
    grade_max: cls.grade_max,
  };
  for (const child of children) {
    const eligibilityError = childEligibilityError(audience, child);
    if (eligibilityError) {
      return { success: false, error: eligibilityError };
    }
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

async function requireHealthDeclarations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  children: { id: string; full_name: string }[]
): Promise<string | null> {
  if (children.length === 0) return null;

  const { data } = await supabase
    .from("health_declarations")
    .select("child_id")
    .eq("parent_id", parentId)
    .eq("school_year", declarationSchoolYear())
    .in(
      "child_id",
      children.map((child) => child.id)
    );

  const missing = missingHealthDeclarationChildren(
    children,
    (data ?? []).map((row) => row.child_id)
  );
  if (missing.length === 0) return null;
  return healthDeclarationErrorFor(missing.map((child) => child.full_name));
}
