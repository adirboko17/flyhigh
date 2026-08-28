"use server";

import {
  childEligibilityError,
  parentGenderError,
  type ClassAudienceFields,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { createSessionReadClient, requireRole } from "@/lib/auth";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { revalidatePath } from "next/cache";
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
import { countHeldSeats, enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";
import {
  classInstallmentOptions,
  classPeriodTotal,
} from "@/lib/finance/classPricing";
import { prorateClassPrice } from "@/lib/finance/proratedClassPrice";
import {
  calculateOrderTotal,
  loadFamilyDiscountSettings,
  parseSiblingTiers,
  siblingTiersForCheckout,
  splitSiblingAmounts,
} from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
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
import { resolveClassParticipants } from "@/lib/enrollment/trainees";
import {
  isUniqueSessionViolation,
  loadBookableAppointmentSessions,
  uniqueSessionIds,
} from "@/lib/enrollment/appointmentSessions";

/** אמצעי התשלום שאפשר לבחור במסך ההרשמה. */
export type CheckoutPaymentMethod = "credit_card" | DeferredPaymentMethod;

const ALLOWED_CHECKOUT_METHODS: readonly CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

function childrenEligibilityError(
  cls: Omit<ClassAudienceFields, "gender_policy"> & {
    gender_policy: ClassGenderPolicy;
  },
  children: Parameters<typeof childEligibilityError>[1][],
  slotGenders: ClassGenderPolicy[]
): string | null {
  const genders = slotGenders.length > 0 ? slotGenders : [cls.gender_policy];
  for (const child of children) {
    for (const gender of genders) {
      const eligibilityError = childEligibilityError(
        { ...cls, gender_policy: gender },
        child
      );
      if (eligibilityError) return eligibilityError;
    }
  }
  return null;
}

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
  includeSelf?: boolean;
  weeklySlotId?: string | null;
  sessionIds?: string[];
}): Promise<CouponPreviewResult> {
  const profile = await requireRole("parent");
  const code = normalizeCouponCode(input.code);

  if (!isValidCouponCode(code)) {
    return { success: false, error: "נא להזין קוד קופון תקין." };
  }

  const { uniqueChildIds, participants } = resolveClassParticipants(
    input.childIds,
    Boolean(input.includeSelf)
  );
  if (participants.length === 0) {
    return { success: false, error: "נא לבחור מתאמן או מתאמנת." };
  }

  const supabase = await createClient();
  const subtotal = await classSubtotal(
    supabase,
    profile.id,
    input.classId,
    uniqueChildIds,
    Boolean(input.includeSelf),
    input.weeklySlotId,
    input.sessionIds
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
  fullPrice: number,
  weeklySlotId?: string | null
) {
  let query = supabase
    .from("class_sessions")
    .select("session_date, start_time, status")
    .eq("class_id", classId);
  if (weeklySlotId) {
    query = query.eq("weekly_slot_id", weeklySlotId);
  }

  const { data: sessions } = await query;

  return prorateClassPrice(fullPrice, sessions ?? [], todayInIsrael());
}

/** סכום ההזמנה אחרי הנחת אחים — הבסיס שעליו חל הקופון. */
async function classSubtotal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  classId: string,
  childIds: string[],
  includeSelf: boolean,
  weeklySlotId?: string | null,
  sessionIds?: string[]
): Promise<number | null> {
  const [{ data: cls }, { data: tiersJson }, familyDiscount] = await Promise.all([
    supabase
      .from("classes")
      .select("price, category, billing_months, pick_one_slot, booking_mode")
      .eq("id", classId)
      .in("status", ["active", "full"])
      .maybeSingle(),
    supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
    loadFamilyDiscountSettings(supabase),
  ]);

  if (!cls) return null;

  if (cls.booking_mode === "appointment") {
    const booked = await loadBookableAppointmentSessions(
      supabase,
      classId,
      uniqueSessionIds(sessionIds)
    );
    if ("error" in booked) return null;
    return (Number(cls.price) || 0) * booked.sessions.length;
  }

  const [proration, categorySiblingIds] = await Promise.all([
    loadClassUnitPrice(
      supabase,
      classId,
      classPeriodTotal(Number(cls.price), cls.billing_months),
      cls.pick_one_slot ? weeklySlotId : null
    ),
    listFamilyChildrenInCategory(supabase, parentId, classId, cls.category),
  ]);
  if (proration.hasEnded) return null;

  const { participants } = resolveClassParticipants(childIds, includeSelf);
  const alreadyInCategory = countFamilyChildrenInCategory(
    categorySiblingIds,
    childIds
  );

  return calculateOrderTotal(
    proration.unitPrice,
    participants.length,
    siblingTiersForCheckout(
      cls.category,
      parseSiblingTiers(tiersJson),
      familyDiscount.classCategories
    ),
    alreadyInCategory + participants.length
  ).total;
}

export async function completeClassEnrollmentPayment(input: {
  classId: string;
  childIds: string[];
  includeSelf?: boolean;
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string | null;
  /** תווית לקבלה — אם נבחרה, מחליפה את שם החוג בתיאור החיוב/הקבלה. */
  receiptLabelId?: string | null;
  weeklySlotId?: string | null;
  sessionIds?: string[];
}): Promise<CompleteEnrollmentResult> {
  const profile = await requireRole("parent");
  const { classId, childIds, paymentMethod } = input;

  if (!ALLOWED_CHECKOUT_METHODS.includes(paymentMethod)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו נתמך." };
  }

  const deferred = isDeferredPaymentMethod(paymentMethod);

  const { uniqueChildIds, participants, includeSelf } = resolveClassParticipants(
    childIds,
    Boolean(input.includeSelf)
  );
  if (participants.length === 0) {
    return { success: false, error: "נא לבחור מתאמן או מתאמנת." };
  }

  const supabase = await createClient();
  const reads = await createSessionReadClient();

  const [{ data: cls }, { data: children }, { data: existingEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, price, billing_months, pick_one_slot, booking_mode, category, capacity, status, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, interest_only"
        )
        .eq("id", classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      uniqueChildIds.length > 0
        ? reads
            .from("children")
            .select(
              "id, full_name, gender, birth_date, school_grade, grade_school_year"
            )
            .eq("parent_id", profile.id)
            .in("id", uniqueChildIds)
        : Promise.resolve({ data: [] }),
      reads
        .from("enrollments")
        .select(
          "child_id, status, payment_status, payments(status, payment_method, external_reference)"
        )
        .eq("class_id", classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: "החוג לא נמצא או אינו זמין להרשמה." };
  }
  if (cls.interest_only) {
    return {
      success: false,
      error: "ההרשמה לחוג זה היא ללא תשלום. רעננו את העמוד ונסו שוב.",
    };
  }

  const isAppointment = cls.booking_mode === "appointment";
  const bookedSessions = isAppointment
    ? await loadBookableAppointmentSessions(
        supabase,
        classId,
        uniqueSessionIds(input.sessionIds)
      )
    : null;
  if (bookedSessions && "error" in bookedSessions) {
    return { success: false, error: bookedSessions.error };
  }
  if (isAppointment && participants.length !== 1) {
    return { success: false, error: "נא לבחור מתאמן אחד לתור." };
  }

  let weeklySlotId: string | null = null;
  let slotGenders: ClassGenderPolicy[] = [];
  if (!isAppointment && cls.pick_one_slot) {
    if (!input.weeklySlotId) {
      return { success: false, error: "נא לבחור מועד לחוג." };
    }
    const { data: slot } = await supabase
      .from("class_weekly_slots")
      .select("id, gender_policy")
      .eq("id", input.weeklySlotId)
      .eq("class_id", classId)
      .maybeSingle();
    if (!slot) {
      return { success: false, error: "המועד שנבחר אינו שייך לחוג זה." };
    }
    weeklySlotId = slot.id;
    slotGenders = [slot.gender_policy];
  } else {
    const { data: slots } = await supabase
      .from("class_weekly_slots")
      .select("gender_policy")
      .eq("class_id", classId);
    if (slots && slots.length > 0) {
      slotGenders = [...new Set(slots.map((row) => row.gender_policy))];
    }
  }

  const selectedChildren = children ?? [];
  if (selectedChildren.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const healthError = await requireHealthDeclarations(
    reads,
    profile.id,
    selectedChildren
  );
  if (healthError) return { success: false, error: healthError };

  const eligibilityError = childrenEligibilityError(cls, selectedChildren, slotGenders);
  if (eligibilityError) {
    return { success: false, error: eligibilityError };
  }
  if (includeSelf) {
    const parentError = parentGenderError(
      profile.full_name,
      profile.gender,
      cls.gender_policy,
      slotGenders
    );
    if (parentError) return { success: false, error: parentError };
  }

  const holdingEnrollments = (existingEnrollments ?? []).filter((enrollment) =>
    enrollmentHoldsSeat(enrollment)
  );
  const alreadyEnrolled = new Set(
    holdingEnrollments.map((e) => e.child_id).filter(Boolean) as string[]
  );
  const duplicate = uniqueChildIds.find((id) => alreadyEnrolled.has(id));
  if (!isAppointment && duplicate) {
    return { success: false, error: "אחד או יותר מהילדים כבר רשומים לחוג זה." };
  }
  if (
    !isAppointment &&
    includeSelf &&
    holdingEnrollments.some((enrollment) => enrollment.child_id == null)
  ) {
    return { success: false, error: "ההורה כבר רשום לחוג זה." };
  }

  const takenCount = isAppointment
    ? 0
    : await countHeldSeats(supabase, classId, weeklySlotId);

  if (!isAppointment && cls.capacity != null) {
    const available = cls.capacity - (takenCount ?? 0);
    if (participants.length > available) {
      return {
        success: false,
        error:
          available <= 0
            ? "החוג מלא. אפשר להצטרף לרשימת המתנה."
            : "אין מספיק מקומות במועד זה להרשמה של כל המתאמנים שנבחרו.",
      };
    }
  }

  // הנחת אחים נקבעת לפי אחים רשומים לאותה קטגוריה — גם בחוג אחר —
  // וחלה רק על הילד השני ומעלה (לא על הילד הראשון במשפחה).
  const [{ data: tiersJson }, categorySiblingIds, familyDiscount] = await Promise.all([
    supabase.rpc("class_sibling_discount_tiers", { p_class_id: classId }),
    listFamilyChildrenInCategory(
      reads,
      profile.id,
      classId,
      cls.category
    ),
    loadFamilyDiscountSettings(supabase),
  ]);

  const appointmentCount =
    bookedSessions && "sessions" in bookedSessions
      ? bookedSessions.sessions.length
      : 0;
  const proration = isAppointment
    ? {
        unitPrice: Number(cls.price) || 0,
        hasEnded: false,
      }
    : await loadClassUnitPrice(
        supabase,
        classId,
        classPeriodTotal(Number(cls.price), cls.billing_months),
        weeklySlotId
      );
  if (proration.hasEnded) {
    return { success: false, error: "החוג כבר הסתיים ולא ניתן להירשם אליו." };
  }

  const unitPrice = proration.unitPrice;
  const alreadyEnrolledCount = isAppointment
    ? 0
    : countFamilyChildrenInCategory(categorySiblingIds, uniqueChildIds);
  const order = isAppointment
    ? {
        total: unitPrice * appointmentCount,
        percent: 0,
      }
    : calculateOrderTotal(
        unitPrice,
        participants.length,
        siblingTiersForCheckout(
          cls.category,
          parseSiblingTiers(tiersJson),
          familyDiscount.classCategories
        ),
        alreadyEnrolledCount + participants.length
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
    participants.length,
    order.percent,
    alreadyEnrolledCount,
    totalAmount,
  );
  const amountPerParticipant = new Map(
    participants.map((participantId, index) => [participantId, childAmounts[index]])
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
    participantCount: participants.length,
    kind: "class",
    customLabel: receiptLabel.description,
  });

  // תשלום נדחה נגבה מול המשרד. כרטיס אשראי נפתח כחוב עד שאישור קארדקום.
  // הזמנה שהקופון מאפס אותה לא עוברת סליקה.
  const awaitingCardcom = !deferred && totalAmount > 0;

  const paidAt = new Date().toISOString();
  const enrollmentRows =
    bookedSessions && "sessions" in bookedSessions
      ? bookedSessions.sessions.map((session) => ({
          parent_id: profile.id,
          child_id: participants[0] ?? null,
          class_id: classId,
          weekly_slot_id: session.weekly_slot_id,
          session_id: session.id,
          type: "class" as const,
          status: "active" as const,
          payment_status:
            deferred || awaitingCardcom ? ("unpaid" as const) : ("paid" as const),
          discount_percent: 0,
        }))
      : participants.map((childId, index) => {
          const paysFull =
            order.percent <= 0 || (alreadyEnrolledCount === 0 && index === 0);
          return {
            parent_id: profile.id,
            child_id: childId,
            class_id: classId,
            weekly_slot_id: weeklySlotId,
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
    return {
      success: false,
      error: isUniqueSessionViolation(enrollmentError)
        ? "אחד מהתורים כבר תפוס. רעננו ובחרו תור אחר."
        : "לא הצלחנו לשמור את ההרשמות. נסו שוב.",
    };
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
        amount: isAppointment
          ? unitPrice
          : (amountPerParticipant.get(enrollment.child_id) ?? unitPrice),
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
      metadata: { classId, childIds: uniqueChildIds, weeklySlotId },
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

  if (deferred && totalAmount > 0) {
    await notifyAdminPayment({
      paid: false,
      parentName: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      product: chargeDescription,
      amount: totalAmount,
      paymentMethod,
      participants: [
        ...selectedChildren.map((child) => child.full_name),
        ...(includeSelf ? [profile.full_name] : []),
      ],
    });
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

export async function registerInterestForClass(input: {
  classId: string;
  childIds: string[];
  includeSelf?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const profile = await requireRole("parent");
  const { uniqueChildIds, participants, includeSelf } = resolveClassParticipants(
    input.childIds,
    Boolean(input.includeSelf)
  );
  if (participants.length === 0) {
    return { success: false, error: "נא לבחור מתאמן או מתאמנת." };
  }

  const supabase = await createClient();
  const reads = await createSessionReadClient();
  const [{ data: cls }, { data: children }, { data: existingEnrollments }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, capacity, status, gender_policy, audience_type, age_min, age_max, grade_min, grade_max, interest_only"
        )
        .eq("id", input.classId)
        .in("status", ["active", "full"])
        .maybeSingle(),
      uniqueChildIds.length > 0
        ? reads
            .from("children")
            .select(
              "id, full_name, gender, birth_date, school_grade, grade_school_year"
            )
            .eq("parent_id", profile.id)
            .in("id", uniqueChildIds)
        : Promise.resolve({ data: [] }),
      reads
        .from("enrollments")
        .select(
          "child_id, status, payment_status, payments(status, payment_method, external_reference)"
        )
        .eq("class_id", input.classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls?.interest_only) {
    return { success: false, error: "החוג הזה אינו פתוח להרשמת עניין." };
  }

  const selectedChildren = children ?? [];
  if (selectedChildren.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const healthError = await requireHealthDeclarations(
    reads,
    profile.id,
    selectedChildren
  );
  if (healthError) return { success: false, error: healthError };

  const eligibilityError = childrenEligibilityError(
    cls,
    selectedChildren,
    [cls.gender_policy]
  );
  if (eligibilityError) return { success: false, error: eligibilityError };
  if (includeSelf) {
    const parentError = parentGenderError(
      profile.full_name,
      profile.gender,
      cls.gender_policy,
      [cls.gender_policy]
    );
    if (parentError) return { success: false, error: parentError };
  }

  const holdingEnrollments = (existingEnrollments ?? []).filter((enrollment) =>
    enrollmentHoldsSeat(enrollment)
  );
  const alreadyEnrolled = new Set(
    holdingEnrollments.map((e) => e.child_id).filter(Boolean) as string[]
  );
  if (uniqueChildIds.some((id) => alreadyEnrolled.has(id))) {
    return { success: false, error: "אחד או יותר מהילדים כבר רשומים לחוג זה." };
  }
  if (
    includeSelf &&
    holdingEnrollments.some((enrollment) => enrollment.child_id == null)
  ) {
    return { success: false, error: "ההורה כבר רשום לחוג זה." };
  }

  const takenCount = await countHeldSeats(supabase, input.classId);

  if (cls.capacity != null) {
    const available = cls.capacity - (takenCount ?? 0);
    if (participants.length > available) {
      return {
        success: false,
        error:
          available <= 0
            ? "ההרשמה לחוג זה מלאה."
            : "אין מספיק מקומות להרשמה של כל המתאמנים שנבחרו.",
      };
    }
  }

  const { error: enrollmentError } = await supabase.from("enrollments").insert(
    participants.map((childId) => ({
      parent_id: profile.id,
      child_id: childId,
      class_id: input.classId,
      type: "class" as const,
      status: "active" as const,
      payment_status: "not_required" as const,
    }))
  );

  if (enrollmentError) {
    return { success: false, error: "לא הצלחנו לשמור את ההרשמה. נסו שוב." };
  }

  revalidatePath("/parent/dashboard");
  await revalidatePublicCatalog();
  return { success: true };
}

export async function cancelInterestEnrollment(
  enrollmentId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status, payment_status")
    .eq("id", enrollmentId)
    .eq("parent_id", profile.id)
    .maybeSingle();

  if (!enrollment) {
    return { success: false, error: "ההרשמה לא נמצאה." };
  }
  if (enrollment.status === "cancelled") {
    return { success: true };
  }
  if (enrollment.payment_status !== "not_required") {
    return { success: false, error: "אפשר לבטל רק הרשמת עניין." };
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollment.id)
    .eq("parent_id", profile.id);

  if (error) {
    return { success: false, error: "לא הצלחנו לבטל את ההרשמה. נסו שוב." };
  }

  revalidatePath("/parent/dashboard");
  await revalidatePublicCatalog();
  return { success: true };
}

export async function joinClassWaitlist(input: {
  classId: string;
  childIds: string[];
  includeSelf?: boolean;
  weeklySlotId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole("parent");
  const { uniqueChildIds, participants, includeSelf } = resolveClassParticipants(
    input.childIds,
    Boolean(input.includeSelf)
  );

  if (participants.length === 0) {
    return { success: false, error: "נא לבחור מתאמן או מתאמנת." };
  }

  const supabase = await createClient();
  const reads = await createSessionReadClient();

  const [{ data: cls }, { data: children }, { data: existingWaitlist }] =
    await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, pick_one_slot, booking_mode, gender_policy, audience_type, age_min, age_max, grade_min, grade_max"
        )
        .eq("id", input.classId)
        .maybeSingle(),
      uniqueChildIds.length > 0
        ? reads
            .from("children")
            .select(
              "id, full_name, gender, birth_date, school_grade, grade_school_year"
            )
            .eq("parent_id", profile.id)
            .in("id", uniqueChildIds)
        : Promise.resolve({ data: [] }),
      reads
        .from("waitlist")
        .select("child_id")
        .eq("class_id", input.classId)
        .eq("parent_id", profile.id)
        .neq("status", "cancelled"),
    ]);

  if (!cls) {
    return { success: false, error: "החוג לא נמצא." };
  }
  if (cls.booking_mode === "appointment") {
    return { success: false, error: "לתורים לטיפול אין רשימת המתנה — בחרו תור פנוי." };
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

  let slotGenders: ClassGenderPolicy[] = [];
  if (cls.pick_one_slot) {
    if (!input.weeklySlotId) {
      return { success: false, error: "נא לבחור מועד לחוג." };
    }
    const { data: slot } = await supabase
      .from("class_weekly_slots")
      .select("id, gender_policy")
      .eq("id", input.weeklySlotId)
      .eq("class_id", input.classId)
      .maybeSingle();
    if (!slot) {
      return { success: false, error: "המועד שנבחר אינו שייך לחוג זה." };
    }
    slotGenders = [slot.gender_policy];
  } else {
    const { data: slots } = await supabase
      .from("class_weekly_slots")
      .select("gender_policy")
      .eq("class_id", input.classId);
    if (slots && slots.length > 0) {
      slotGenders = [...new Set(slots.map((row) => row.gender_policy))];
    }
  }

  const selectedChildren = children ?? [];
  if (selectedChildren.length !== uniqueChildIds.length) {
    return { success: false, error: "אחד או יותר מהילדים שנבחרו אינם תקינים." };
  }

  const healthError = await requireHealthDeclarations(
    reads,
    profile.id,
    selectedChildren
  );
  if (healthError) return { success: false, error: healthError };

  const eligibilityError = childrenEligibilityError(cls, selectedChildren, slotGenders);
  if (eligibilityError) {
    return { success: false, error: eligibilityError };
  }
  if (includeSelf) {
    const parentError = parentGenderError(
      profile.full_name,
      profile.gender,
      cls.gender_policy,
      slotGenders
    );
    if (parentError) return { success: false, error: parentError };
  }

  const alreadyWaitlisted = new Set(
    (existingWaitlist ?? [])
      .map((w) => w.child_id)
      .filter(Boolean) as string[]
  );
  const parentAlreadyWaitlisted = (existingWaitlist ?? []).some(
    (entry) => entry.child_id == null
  );
  const toAdd: (string | null)[] = uniqueChildIds.filter(
    (id) => !alreadyWaitlisted.has(id)
  );
  if (includeSelf && !parentAlreadyWaitlisted) toAdd.push(null);

  if (toAdd.length === 0) {
    return { success: false, error: "כל המתאמנים שנבחרו כבר ברשימת המתנה." };
  }

  const { error } = await supabase.from("waitlist").insert(
    toAdd.map((childId) => ({
      parent_id: profile.id,
      child_id: childId,
      class_id: input.classId,
      weekly_slot_id: input.weeklySlotId ?? null,
      status: "waiting" as const,
    }))
  );

  if (error) {
    return { success: false, error: "לא הצלחנו לשמור את רשימת המתנה. נסו שוב." };
  }

  return { success: true };
}

async function requireHealthDeclarations(
  supabase: Awaited<ReturnType<typeof createSessionReadClient>>,
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
