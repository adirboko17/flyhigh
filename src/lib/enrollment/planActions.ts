"use server";

import { requireRole } from "@/lib/auth";
import { DEFERRED_PAYMENT_METHODS, isDeferredPaymentMethod } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  isValidCouponCode,
  normalizeCouponCode,
  type AppliedCoupon,
} from "@/lib/finance/coupon";
import { splitAmount } from "@/lib/finance/siblingDiscount";
import { getPaymentProvider } from "@/lib/integrations/payments";
import type { CheckoutPaymentMethod, CouponPreviewResult } from "./actions";

/** רכישה של מסלול (מנוי) או של כרטיסיית כניסות לבריכה. */
export type PlanKind = "program" | "pool_pass";

const ALLOWED_CHECKOUT_METHODS: readonly CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

export type CompletePlanPurchaseResult =
  | {
      success: true;
      enrollmentIds: string[];
      /** אסמכתת סליקה — קיימת רק בתשלום מיידי בכרטיס אשראי. */
      paymentReference: string | null;
      /** תשלום שנגבה מול המשרד ונרשם כחוב פתוח בעמוד הגבייה. */
      deferred: boolean;
      total: number;
      couponCode: string | null;
      couponDiscount: number;
    }
  | { success: false; error: string };

type PlanRecord = { id: string; title: string; price: number };

async function loadActivePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: PlanKind,
  planId: string
): Promise<PlanRecord | null> {
  if (kind === "program") {
    const { data } = await supabase
      .from("programs")
      .select("id, title, price")
      .eq("id", planId)
      .eq("status", "active")
      .maybeSingle();
    return data
      ? { id: data.id, title: data.title, price: Number(data.price) }
      : null;
  }

  const { data } = await supabase
    .from("pool_passes")
    .select("id, title, price")
    .eq("id", planId)
    .eq("status", "active")
    .maybeSingle();
  return data
    ? { id: data.id, title: data.title, price: Number(data.price) }
    : null;
}

/** ההשתתפויות בהזמנה: ילדים שנבחרו, ובנוסף ההורה עצמו אם סימן זאת. */
function resolveParticipants(childIds: string[], includeSelf: boolean) {
  const uniqueChildIds = [...new Set(childIds.filter(Boolean))];
  const participants: (string | null)[] = [...uniqueChildIds];
  if (includeSelf) participants.push(null);
  return { uniqueChildIds, participants };
}

function planNotFoundError(kind: PlanKind): string {
  return kind === "program"
    ? "המסלול לא נמצא או אינו זמין לרכישה."
    : "הכרטיסייה לא נמצאה או אינה זמינה לרכישה.";
}

/**
 * בדיקת קוד קופון לפני התשלום. הסכום מחושב בשרת לפי מחיר המסלול ומספר
 * המשתתפים, כדי שלא ניתן יהיה לנפח את ההנחה מהדפדפן.
 */
export async function previewPlanCoupon(input: {
  code: string;
  kind: PlanKind;
  planId: string;
  childIds: string[];
  includeSelf: boolean;
}): Promise<CouponPreviewResult> {
  await requireRole("parent");
  const code = normalizeCouponCode(input.code);

  if (!isValidCouponCode(code)) {
    return { success: false, error: "נא להזין קוד קופון תקין." };
  }

  const { participants } = resolveParticipants(input.childIds, input.includeSelf);
  if (participants.length === 0) {
    return { success: false, error: "נא לבחור למי הרכישה." };
  }

  const supabase = await createClient();
  const plan = await loadActivePlan(supabase, input.kind, input.planId);

  if (!plan) {
    return { success: false, error: planNotFoundError(input.kind) };
  }

  const subtotal = Math.round(plan.price * participants.length * 100) / 100;

  const { data, error } = await supabase.rpc("preview_coupon", {
    p_code: code,
    p_program_id: input.kind === "program" ? input.planId : null,
    p_pool_pass_id: input.kind === "pool_pass" ? input.planId : null,
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
}): Promise<CompletePlanPurchaseResult> {
  const profile = await requireRole("parent");
  const { kind, planId, paymentMethod } = input;

  if (!ALLOWED_CHECKOUT_METHODS.includes(paymentMethod)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו נתמך." };
  }

  const deferred = isDeferredPaymentMethod(paymentMethod);
  const { uniqueChildIds, participants } = resolveParticipants(
    input.childIds,
    input.includeSelf
  );

  if (participants.length === 0) {
    return { success: false, error: "נא לבחור למי הרכישה." };
  }

  const supabase = await createClient();
  const plan = await loadActivePlan(supabase, kind, planId);

  if (!plan) {
    return { success: false, error: planNotFoundError(kind) };
  }

  if (uniqueChildIds.length > 0) {
    const { data: children } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", profile.id)
      .in("id", uniqueChildIds);

    if (!children || children.length !== uniqueChildIds.length) {
      return {
        success: false,
        error: "אחד או יותר מהילדים שנבחרו אינם תקינים.",
      };
    }
  }

  // מסלול הוא מנוי מתמשך, ולכן אין טעם לרכוש אותו פעמיים לאותו משתתף.
  // כרטיסיית כניסות לעומת זאת ניתנת לרכישה חוזרת ללא הגבלה.
  if (kind === "program") {
    const { data: existing } = await supabase
      .from("enrollments")
      .select("child_id")
      .eq("program_id", planId)
      .eq("parent_id", profile.id)
      .neq("status", "cancelled");

    const taken = new Set(
      (existing ?? []).map((row) => row.child_id as string | null)
    );
    if (participants.some((participant) => taken.has(participant))) {
      return {
        success: false,
        error: "אחד או יותר מהמשתתפים שנבחרו כבר רשומים למסלול הזה.",
      };
    }
  }

  const unitPrice = plan.price;
  const listTotal = Math.round(unitPrice * participants.length * 100) / 100;

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
        p_program_id: kind === "program" ? planId : null,
        p_pool_pass_id: kind === "pool_pass" ? planId : null,
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
  const amounts = splitAmount(totalAmount, participants.length);
  const amountByParticipant = new Map<string | null, number>(
    participants.map((participant, index) => [participant, amounts[index]])
  );

  // תשלום נדחה (מזומן, העברה, מכבי, עמית) נגבה מול המשרד ולכן לא עובר סליקה,
  // וגם הזמנה שהקופון מאפס אותה לא עוברת סליקה.
  let paymentReference: string | null = null;

  if (!deferred && totalAmount > 0) {
    const charge = await getPaymentProvider().createCharge({
      amount: totalAmount,
      description: `רכישת ${plan.title} (${participants.length} משתתפים)`,
      parentId: profile.id,
      method: paymentMethod,
      metadata: { kind, planId, childIds: uniqueChildIds, includeSelf: input.includeSelf },
    });

    if (!charge.success) {
      await releaseCoupon();
      return { success: false, error: "התשלום נכשל. נסו שוב." };
    }

    paymentReference = charge.reference;
  }

  const paidAt = new Date().toISOString();
  const enrollmentRows = participants.map((childId) => ({
    parent_id: profile.id,
    child_id: childId,
    class_id: null,
    program_id: kind === "program" ? planId : null,
    pool_pass_id: kind === "pool_pass" ? planId : null,
    type: kind,
    status: "active" as const,
    payment_status: deferred ? ("unpaid" as const) : ("paid" as const),
  }));

  const { data: createdEnrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id, child_id");

  if (enrollmentError || !createdEnrollments?.length) {
    await releaseCoupon();
    return { success: false, error: "לא הצלחנו לשמור את הרכישה. נסו שוב." };
  }

  if (redemptionId) {
    await supabase.rpc("link_coupon_redemption", {
      p_redemption_id: redemptionId,
      p_enrollment_id: createdEnrollments[0].id,
    });
  }

  // חיוב נפרד לכל משתתף, כדי שברשימת הגבייה יהיה ברור על מה בדיוק החוב.
  const { error: paymentError } = await supabase.from("payments").insert(
    createdEnrollments.map((enrollment) => ({
      parent_id: profile.id,
      enrollment_id: enrollment.id,
      amount: amountByParticipant.get(enrollment.child_id) ?? unitPrice,
      payment_method: paymentMethod,
      status: deferred ? ("pending" as const) : ("paid" as const),
      paid_at: deferred ? null : paidAt,
      external_reference: paymentReference,
    }))
  );

  if (paymentError) {
    return {
      success: false,
      error: "הרכישה נשמרה אך רישום התשלום נכשל. פנו לצוות.",
    };
  }

  return {
    success: true,
    enrollmentIds: createdEnrollments.map((e) => e.id),
    paymentReference,
    deferred,
    total: totalAmount,
    couponCode,
    couponDiscount,
  };
}
