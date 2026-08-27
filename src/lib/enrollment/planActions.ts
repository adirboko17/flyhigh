"use server";

import { createSessionReadClient, requireRole } from "@/lib/auth";
import { DEFERRED_PAYMENT_METHODS, isDeferredPaymentMethod } from "@/lib/constants";
import { addMonths, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCouponCode,
  normalizeCouponCode,
} from "@/lib/finance/coupon";
import {
  calculateOrderTotal,
  familyDiscountAppliesToProduct,
  familyDiscountProductForPlan,
  loadFamilyDiscountSettings,
  splitAmount,
  splitSiblingAmounts,
} from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
import {
  chargeDescriptionForCheckout,
  resolveReceiptLabelForCheckout,
} from "@/lib/enrollment/receiptLabel";
import {
  activityPeopleCap,
  parseActivityPriceTiers,
  quoteActivityPrice,
  type ActivityPriceTier,
} from "@/lib/finance/activityPricing";
import {
  ACTIVITY_MAX_PEOPLE,
  isActivityProgram,
  isSessionActivity,
  type ProgramKind,
} from "@/lib/programs";
import { planInstallmentOptions } from "@/lib/finance/installments";
import type { CheckoutPaymentMethod, CouponPreviewResult } from "./actions";

/** רכישה של מסלול, כרטיסייה או שיעור פרטי. */
export type PlanKind = "program" | "pool_pass" | "private_lesson";

const ALLOWED_CHECKOUT_METHODS: readonly CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

export type CompletePlanPurchaseResult =
  | {
      success: true;
      enrollmentIds: string[];
      /** אסמכתת סליקה — קיימת אחרי פתיחת דף קארדקום או בתשלום שכבר הושלם. */
      paymentReference: string | null;
      /** דף הסליקה של קארדקום — כשיש סכום לתשלום בכרטיס. */
      checkoutUrl: string | null;
      /** תשלום שנגבה מול המשרד ונרשם כחוב פתוח בעמוד הגבייה. */
      deferred: boolean;
      total: number;
      couponCode: string | null;
      couponDiscount: number;
    }
  | { success: false; error: string };

type PlanRecord = {
  id: string;
  title: string;
  price: number;
  durationMonths: number | null;
  durationMinutes: number | null;
  programKind: ProgramKind | null;
  priceTiers: ActivityPriceTier[];
  entriesCount: number | null;
  extraHalfHourPrice: number | null;
};

function sessionActivity(plan: Pick<PlanRecord, "programKind" | "durationMinutes" | "priceTiers">) {
  return isSessionActivity({
    kind: plan.programKind,
    durationMinutes: plan.durationMinutes,
    hasGroupPricing: plan.priceTiers.length > 0,
  });
}

async function rollbackPlanPurchase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrollmentIds: string[],
  paymentIds: string[] = []
) {
  if (paymentIds.length > 0) {
    await supabase.from("payments").delete().in("id", paymentIds);
  }
  await supabase.from("private_lesson_slots").delete().in("enrollment_id", enrollmentIds);
  await supabase.from("activity_bookings").delete().in("enrollment_id", enrollmentIds);
  await supabase.from("enrollments").delete().in("id", enrollmentIds);
}

function usesQuantity(
  kind: PlanKind,
  programKind: ProgramKind | null,
  session = false
) {
  if (session) return false;
  return kind === "private_lesson" || isActivityProgram(programKind);
}

function normalizeQuantity(
  kind: PlanKind,
  programKind: ProgramKind | null,
  quantity?: number,
  maxPeople = ACTIVITY_MAX_PEOPLE,
  session = false
) {
  if (!usesQuantity(kind, programKind, session)) return 1;
  const value = Math.floor(Number(quantity ?? 1));
  if (!Number.isFinite(value) || value < 1) return null;
  if (value > maxPeople) return null;
  return value;
}

async function loadActivePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: PlanKind,
  planId: string
): Promise<PlanRecord | null> {
  if (kind === "program") {
    const { data } = await supabase
      .from("programs")
      .select("id, title, price, duration_months, duration_minutes, kind, price_tiers, extra_half_hour_price")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    return data
      ? {
          id: data.id,
          title: data.title,
          price: Number(data.price),
          durationMonths: data.duration_months,
          durationMinutes: data.duration_minutes,
          programKind: data.kind,
          priceTiers: parseActivityPriceTiers(data.price_tiers),
          entriesCount: null,
          extraHalfHourPrice: data.extra_half_hour_price,
        }
      : null;
  }

  if (kind === "pool_pass") {
    const { data } = await supabase
      .from("pool_passes")
      .select("id, title, price, entries_count")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    return data
      ? {
          id: data.id,
          title: data.title,
          price: Number(data.price),
          durationMonths: null,
          durationMinutes: null,
          programKind: null,
          priceTiers: [],
          entriesCount: data.entries_count,
          extraHalfHourPrice: null,
        }
      : null;
  }

  const { data } = await supabase
    .from("private_lessons")
    .select("id, title, price")
    .eq("id", planId)
    .eq("status", "active")
    .maybeSingle();
  return data
    ? {
        id: data.id,
        title: data.title,
        price: Number(data.price),
        durationMonths: null,
        durationMinutes: null,
        programKind: null,
        priceTiers: [],
        entriesCount: null,
        extraHalfHourPrice: null,
      }
      : null;
}

/** ההשתתפויות בהזמנה: ילדים שנבחרו, ובנוסף ההורה עצמו אם סימן זאת. */
function resolveParticipants(childIds: string[], includeSelf: boolean) {
  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  const participants: (string | null)[] = [...uniqueChildIds];
  if (includeSelf) participants.push(null);
  return { uniqueChildIds, participants };
}

async function countFamilyPlanParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  kind: PlanKind
) {
  const { data } = await supabase
    .from("enrollments")
    .select("child_id")
    .eq("parent_id", parentId)
    .eq("type", kind)
    .neq("status", "cancelled");

  const children = new Set<string>();
  let hasSelf = false;
  for (const row of data ?? []) {
    if (row.child_id) children.add(row.child_id);
    else hasSelf = true;
  }
  return children.size + (hasSelf ? 1 : 0);
}

async function applyPlanFamilyDiscount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentId: string,
  kind: PlanKind,
  programKind: ProgramKind | null,
  listTotal: number,
  participantCount: number,
  skip: boolean
) {
  if (skip || participantCount <= 0 || listTotal <= 0) {
    return { total: listTotal, percent: 0, alreadyEnrolled: 0 };
  }

  const settings = await loadFamilyDiscountSettings(supabase);
  const product = familyDiscountProductForPlan(kind, programKind);
  if (
    !familyDiscountAppliesToProduct(product, settings.productTypes) ||
    settings.tiers.length === 0
  ) {
    return { total: listTotal, percent: 0, alreadyEnrolled: 0 };
  }

  const alreadyEnrolled = await countFamilyPlanParticipants(
    supabase,
    parentId,
    kind
  );
  const unit = Math.round((listTotal / participantCount) * 100) / 100;
  const order = calculateOrderTotal(
    unit,
    participantCount,
    settings.tiers,
    alreadyEnrolled + participantCount
  );
  return {
    total: order.total,
    percent: order.percent,
    alreadyEnrolled,
  };
}

function planSubtotal(
  plan: PlanRecord,
  quantity: number,
  participantCount: number
): number | null {
  if (sessionActivity(plan)) {
    return Math.round(plan.price * participantCount * 100) / 100;
  }
  if (isActivityProgram(plan.programKind)) {
    return quoteActivityPrice(quantity, plan.price, plan.priceTiers)?.amount ?? null;
  }
  return Math.round(plan.price * quantity * participantCount * 100) / 100;
}

function planNotFoundError(kind: PlanKind): string {
  if (kind === "program") return "המנוי או הפעילות לא נמצאו או אינם זמינים לרכישה.";
  if (kind === "pool_pass") return "הכרטיסייה לא נמצאה או אינה זמינה לרכישה.";
  return "השיעור הפרטי לא נמצא או אינו זמין לרכישה.";
}

function couponRpcIds(kind: PlanKind, planId: string) {
  return {
    p_program_id: kind === "program" ? planId : undefined,
    p_pool_pass_id: kind === "pool_pass" ? planId : undefined,
    p_private_lesson_id: kind === "private_lesson" ? planId : undefined,
  };
}

/**
 * בדיקת קוד קופון לפני התשלום. הסכום מחושב בשרת לפי מחיר המסלול ומספר
 * המשתתפים (וכמות בשיעור פרטי), כדי שלא ניתן יהיה לנפח את ההנחה מהדפדפן.
 */
export async function previewPlanCoupon(input: {
  code: string;
  kind: PlanKind;
  planId: string;
  childIds: string[];
  includeSelf: boolean;
  quantity?: number;
}): Promise<CouponPreviewResult> {
  const profile = await requireRole("parent");
  const code = normalizeCouponCode(input.code);

  if (!isValidCouponCode(code)) {
    return { success: false, error: "נא להזין קוד קופון תקין." };
  }

  const supabase = await createClient();
  const plan = await loadActivePlan(supabase, input.kind, input.planId);

  if (!plan) {
    return { success: false, error: planNotFoundError(input.kind) };
  }

  const quantity = normalizeQuantity(
    input.kind,
    plan.programKind,
    input.quantity,
    activityPeopleCap(plan.priceTiers),
    sessionActivity(plan)
  );
  if (quantity === null) {
    return {
      success: false,
      error: isActivityProgram(plan.programKind)
        ? "נא לבחור מספר משתתפים תקין."
        : "נא לבחור כמות תקינה של שיעורים.",
    };
  }

  const { participants } = resolveParticipants(input.childIds, input.includeSelf);
  if (participants.length === 0) {
    return { success: false, error: "נא לבחור למי הרכישה." };
  }

  const rawSubtotal = planSubtotal(plan, quantity, participants.length);
  if (rawSubtotal === null) {
    return {
      success: false,
      error: "מספר המשתתפים שנבחר אינו במחירון. בחרו כמות מאחת המדרגות.",
    };
  }

  const skipFamily =
    isActivityProgram(plan.programKind) && !sessionActivity(plan);
  const family = await applyPlanFamilyDiscount(
    supabase,
    profile.id,
    input.kind,
    plan.programKind,
    rawSubtotal,
    participants.length,
    skipFamily
  );
  const subtotal = family.total;

  const { data, error } = await supabase.rpc("preview_coupon", {
    p_code: code,
    ...couponRpcIds(input.kind, input.planId),
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

export async function completePlanPurchase(input: {
  kind: PlanKind;
  planId: string;
  childIds: string[];
  includeSelf: boolean;
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string | null;
  /** כמות שיעורים למשתתף, או מספר נפשות בפעילות הפוגה. */
  quantity?: number;
  /** תווית לקבלה — אם נבחרה, מחליפה את שם המוצר בתיאור החיוב/הקבלה. */
  receiptLabelId?: string | null;
}): Promise<CompletePlanPurchaseResult> {
  const profile = await requireRole("parent");
  const { kind, planId, paymentMethod } = input;

  if (!ALLOWED_CHECKOUT_METHODS.includes(paymentMethod)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו נתמך." };
  }

  const deferred = isDeferredPaymentMethod(paymentMethod);
  const includeSelf = input.includeSelf;
  const { uniqueChildIds, participants } = resolveParticipants(
    input.childIds,
    includeSelf
  );

  if (participants.length === 0) {
    return { success: false, error: "נא לבחור למי הרכישה." };
  }

  const supabase = await createClient();
  const plan = await loadActivePlan(supabase, kind, planId);

  if (!plan) {
    return { success: false, error: planNotFoundError(kind) };
  }

  const isActivity = isActivityProgram(plan.programKind);
  const isSession = sessionActivity(plan);
  const quantity = normalizeQuantity(
    kind,
    plan.programKind,
    input.quantity,
    activityPeopleCap(plan.priceTiers),
    isSession
  );
  if (quantity === null) {
    return {
      success: false,
      error: isActivity
        ? "נא לבחור מספר משתתפים תקין."
        : "נא לבחור כמות תקינה של שיעורים.",
    };
  }

  let selectedChildren: { id: string; full_name: string }[] = [];
  if (uniqueChildIds.length > 0) {
    const reads = await createSessionReadClient();
    const { data: children } = await reads
      .from("children")
      .select("id, full_name")
      .eq("parent_id", profile.id)
      .in("id", uniqueChildIds);

    if (!children || children.length !== uniqueChildIds.length) {
      return {
        success: false,
        error: "אחד או יותר מהילדים שנבחרו אינם תקינים.",
      };
    }
    selectedChildren = children;
  }

  // מסלול מנוי הוא מתמשך, ולכן אין טעם לרכוש אותו פעמיים לאותו משתתף.
  // פעילות לפי נפשות, כרטיסייה ושיעור פרטי ניתנים לרכישה חוזרת.
  if (kind === "program" && !isActivity) {
    const today = todayInIsrael();
    const { data: existing } = await supabase
      .from("enrollments")
      .select("child_id, ends_on")
      .eq("program_id", planId)
      .eq("parent_id", profile.id)
      .eq("status", "active");

    const taken = new Set(
      (existing ?? [])
        .filter((row) => !row.ends_on || row.ends_on >= today)
        .map((row) => row.child_id as string | null)
    );
    if (participants.some((participant) => taken.has(participant))) {
      return {
        success: false,
        error: "אחד או יותר מהמשתתפים שנבחרו כבר רשומים למנוי הזה.",
      };
    }
  }

  const unitPrice = plan.price;
  const rawSubtotal = planSubtotal(plan, quantity, participants.length);
  if (rawSubtotal === null) {
    return {
      success: false,
      error: "מספר המשתתפים שנבחר אינו במחירון. בחרו כמות מאחת המדרגות.",
    };
  }
  const skipFamily = isActivity && !isSession;
  const family = await applyPlanFamilyDiscount(
    supabase,
    profile.id,
    kind,
    plan.programKind,
    rawSubtotal,
    participants.length,
    skipFamily
  );
  const listTotal = family.total;

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
      {
        p_code: requestedCode,
        ...couponRpcIds(kind, planId),
        p_amount: listTotal,
      }
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

  /** מבטל את תפיסת הקופון כשהרכישה לא הושלמה, כדי שלא תישרף מכסת השימושים. */
  async function releaseCoupon() {
    if (redemptionId) {
      await supabase.rpc("release_coupon", { p_redemption_id: redemptionId });
    }
  }

  const totalAmount =
    Math.max(Math.round((listTotal - couponDiscount) * 100) / 100, 0);
  const activityChildId =
    includeSelf || uniqueChildIds.length !== 1 ? null : uniqueChildIds[0];
  const amounts =
    !isActivity && family.percent > 0
      ? splitSiblingAmounts(
          rawSubtotal / participants.length,
          participants.length,
          family.percent,
          family.alreadyEnrolled,
          totalAmount
        )
      : splitAmount(totalAmount, isActivity ? 1 : participants.length);
  const amountByParticipant = new Map<string | null, number>(
    isActivity
      ? [[activityChildId, amounts[0]]]
      : participants.map((participant, index) => [participant, amounts[index]])
  );

  const receiptLabel = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!receiptLabel.ok) {
    await releaseCoupon();
    return { success: false, error: receiptLabel.error };
  }

  const activityPeople = isSession ? participants.length : quantity;
  const chargeDescription = chargeDescriptionForCheckout({
    productTitle: plan.title,
    participantCount: isActivity ? activityPeople : participants.length,
    kind: "plan",
    customLabel: receiptLabel.description,
  });

  // תשלום נדחה נגבה מול המשרד. כרטיס אשראי נפתח כחוב עד לאישור קארדקום.
  const awaitingCardcom = !deferred && totalAmount > 0;

  const paidAt = new Date().toISOString();
  const membershipStart =
    kind === "program" && !isActivity ? todayInIsrael() : null;
  const membershipEnd =
    kind === "program" && !isActivity && plan.durationMonths
      ? addMonths(membershipStart!, plan.durationMonths)
      : null;
  // פעילות לפי נפשות היא הזמנה אחת למשפחה, לא מנוי נפרד לכל משתתף.
  const enrollmentRows = isActivity
    ? [
        {
          parent_id: profile.id,
          child_id: activityChildId,
          class_id: null,
          program_id: planId,
          pool_pass_id: null,
          private_lesson_id: null,
          type: kind,
          status: "active" as const,
          payment_status:
            deferred || awaitingCardcom ? ("unpaid" as const) : ("paid" as const),
          starts_on: null,
          ends_on: null,
          people_count: activityPeople,
        },
      ]
    : participants.map((childId) => ({
        parent_id: profile.id,
        child_id: childId,
        class_id: null,
        program_id: kind === "program" ? planId : null,
        pool_pass_id: kind === "pool_pass" ? planId : null,
        private_lesson_id: kind === "private_lesson" ? planId : null,
        type: kind,
        status: "active" as const,
        payment_status:
          deferred || awaitingCardcom ? ("unpaid" as const) : ("paid" as const),
        starts_on: membershipStart,
        ends_on: membershipEnd,
        people_count: null as number | null,
      }));

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id, child_id");

  if (enrollmentError || !createdEnrollments?.length) {
    await releaseCoupon();
    return { success: false, error: "לא הצלחנו לשמור את הרכישה. נסו שוב." };
  }

  if (kind === "private_lesson") {
    const slotRows = createdEnrollments.flatMap((enrollment) =>
      Array.from({ length: quantity }, () => ({
        enrollment_id: enrollment.id,
        parent_id: profile.id,
        child_id: enrollment.child_id,
        private_lesson_id: planId,
        status: "awaiting_schedule" as const,
      }))
    );

    const { error: slotsError } = await supabase
      .from("private_lesson_slots")
      .insert(slotRows);

    if (slotsError) {
      await releaseCoupon();
      await supabase
        .from("enrollments")
        .delete()
        .in(
          "id",
          createdEnrollments.map((e) => e.id)
        );
      return {
        success: false,
        error: "לא הצלחנו לשריין את השיעורים לתיאום. נסו שוב.",
      };
    }
  }

  if (isActivity) {
    const bookingRows = createdEnrollments.map((enrollment) => ({
      enrollment_id: enrollment.id,
      parent_id: profile.id,
      child_id: enrollment.child_id,
      program_id: planId,
      people_count: activityPeople,
      status: "awaiting_schedule" as const,
    }));

    const { error: bookingError } = await supabase
      .from("activity_bookings")
      .insert(bookingRows);

    if (bookingError) {
      await releaseCoupon();
      await supabase
        .from("enrollments")
        .delete()
        .in(
          "id",
          createdEnrollments.map((e) => e.id)
        );
      return {
        success: false,
        error: "לא הצלחנו לשריין את הפעילות לתיאום. נסו שוב.",
      };
    }
  }

  if (redemptionId) {
    await supabase.rpc("link_coupon_redemption", {
      p_redemption_id: redemptionId,
      p_enrollment_id: createdEnrollments[0].id,
    });
  }

  // חיוב נפרד לכל משתתף, כדי שברשימת הגבייה יהיה ברור על מה בדיוק החוב.
  const { data: createdPayments, error: paymentError } = await supabase
    .from("payments")
    .insert(
      createdEnrollments.map((enrollment) => ({
        parent_id: profile.id,
        enrollment_id: enrollment.id,
        amount:
          amountByParticipant.get(enrollment.child_id) ?? unitPrice * quantity,
        payment_method: paymentMethod,
        status: deferred || awaitingCardcom ? ("pending" as const) : ("paid" as const),
        paid_at: deferred || awaitingCardcom ? null : paidAt,
        receipt_label_id: receiptLabel.labelId,
        receipt_description: receiptLabel.description ?? chargeDescription,
      }))
    )
    .select("id");

  if (paymentError || !createdPayments?.length) {
    await rollbackPlanPurchase(
      supabase,
      createdEnrollments.map((e) => e.id)
    );
    await releaseCoupon();
    return {
      success: false,
      error: "הרכישה נשמרה אך רישום התשלום נכשל. פנו לצוות.",
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
      metadata: {
        kind,
        planId,
        childIds: uniqueChildIds,
        includeSelf: input.includeSelf,
        quantity,
      },
      installments: planInstallmentOptions({
        kind,
        programKind: plan.programKind,
        title: plan.title,
        entriesCount: plan.entriesCount,
        extraHalfHourPrice: plan.extraHalfHourPrice,
      }),
    });

    if (!charge.success || !charge.redirectUrl) {
      await rollbackPlanPurchase(
        supabase,
        createdEnrollments.map((e) => e.id),
        createdPayments.map((payment) => payment.id)
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
    const participantNames = [
      ...(includeSelf ? [profile.full_name] : []),
      ...selectedChildren.map((child) => child.full_name),
    ];
    await notifyAdminPayment({
      paid: false,
      parentName: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      product: chargeDescription,
      amount: totalAmount,
      paymentMethod,
      participants: participantNames,
    });
  }

  return {
    success: true,
    enrollmentIds: createdEnrollments.map((e) => e.id),
    paymentReference,
    checkoutUrl,
    deferred,
    total: totalAmount,
    couponCode,
    couponDiscount,
  };
}
