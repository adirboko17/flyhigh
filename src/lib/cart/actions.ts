"use server";

import { getSessionProfile, requireRole } from "@/lib/auth";
import type { CartItem } from "@/lib/cart/types";
import type { Enums } from "@/types/database.types";
import { prepareCartLine, type PreparedCartLine } from "@/lib/cart/prepare";
import {
  DEFERRED_PAYMENT_METHODS,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import type { CheckoutPaymentMethod } from "@/lib/enrollment/actions";
import { resolveReceiptLabelForCheckout } from "@/lib/enrollment/receiptLabel";
import type { AppliedCoupon } from "@/lib/finance/coupon";
import { isValidCouponCode, normalizeCouponCode } from "@/lib/finance/coupon";
import { installmentOptions } from "@/lib/finance/installments";
import { getPaymentProvider } from "@/lib/integrations/payments";
import { notifyAdminPayment } from "@/lib/notifications/adminPayment";
import { voidUnpaidCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_METHODS: readonly CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

export type CartQuoteLine = {
  id: string;
  title: string;
  listTotal: number;
  participantNames: string[];
};

export type QuoteCartResult =
  | {
      success: true;
      lines: CartQuoteLine[];
      subtotal: number;
      installmentsMax: number | null;
    }
  | { success: false; error: string };

export type CheckoutCartResult =
  | {
      success: true;
      checkoutUrl: string | null;
      checkoutId: string | null;
      deferred: boolean;
      total: number;
      couponCode: string | null;
      couponDiscount: number;
    }
  | { success: false; error: string; paid?: boolean };

export async function releaseAbandonedCartCheckout(checkoutId: string): Promise<{
  released: boolean;
  paid: boolean;
}> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "parent") {
    return { released: false, paid: false };
  }

  const result = await voidUnpaidCardcomCheckout({
    checkoutId,
    parentId: profile.id,
  });
  return { released: result.voided, paid: result.paid };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function allocateDiscount(amounts: number[], discount: number): number[] {
  const total = round2(amounts.reduce((sum, amount) => sum + amount, 0));
  const cutTotal = Math.min(Math.max(round2(discount), 0), total);
  if (total <= 0 || cutTotal <= 0) return amounts.map((amount) => round2(amount));

  let remaining = cutTotal;
  return amounts.map((amount, index) => {
    if (index === amounts.length - 1) {
      return round2(Math.max(amount - remaining, 0));
    }
    const share = round2((amount / total) * cutTotal);
    remaining = round2(remaining - share);
    return round2(Math.max(amount - share, 0));
  });
}

function couponArgsForLines(lines: PreparedCartLine[]) {
  const classIds = [
    ...new Set(
      lines
        .filter((line) => line.kind === "class")
        .map((line) => line.enrollmentRows[0]?.class_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const programIds = [
    ...new Set(
      lines
        .filter((line) => line.kind === "program")
        .map((line) => line.planId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const passIds = [
    ...new Set(
      lines
        .filter((line) => line.kind === "pool_pass")
        .map((line) => line.planId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const lessonIds = [
    ...new Set(
      lines
        .filter((line) => line.kind === "private_lesson")
        .map((line) => line.planId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (
    classIds.length === 1 &&
    programIds.length === 0 &&
    passIds.length === 0 &&
    lessonIds.length === 0
  ) {
    return { p_class_id: classIds[0] };
  }
  if (
    programIds.length === 1 &&
    classIds.length === 0 &&
    passIds.length === 0 &&
    lessonIds.length === 0
  ) {
    return { p_program_id: programIds[0] };
  }
  if (
    passIds.length === 1 &&
    classIds.length === 0 &&
    programIds.length === 0 &&
    lessonIds.length === 0
  ) {
    return { p_pool_pass_id: passIds[0] };
  }
  if (
    lessonIds.length === 1 &&
    classIds.length === 0 &&
    programIds.length === 0 &&
    passIds.length === 0
  ) {
    return { p_private_lesson_id: lessonIds[0] };
  }
  return {};
}

async function prepareCart(
  items: CartItem[],
  parent: {
    id: string;
    full_name: string;
    gender?: Enums<"gender_type"> | null;
  }
) {
  if (items.length === 0) {
    return { success: false as const, error: "הסל ריק." };
  }

  const supabase = await createClient();
  const reserved = {
    classSpots: new Map<string, number>(),
    categoryKids: new Map<string, string[]>(),
  };
  const lines: PreparedCartLine[] = [];

  for (const item of items) {
    const prepared = await prepareCartLine(
      supabase,
      parent,
      item,
      reserved
    );
    if (!prepared.success) return prepared;
    lines.push(prepared.line);
  }

  const subtotal = round2(
    lines.reduce((sum, line) => sum + line.listTotal, 0)
  );
  const installmentsMax = lines.reduce<number | null>((max, line) => {
    if (line.installmentsMax == null) return max;
    return max == null ? line.installmentsMax : Math.max(max, line.installmentsMax);
  }, null);

  return { success: true as const, supabase, lines, subtotal, installmentsMax };
}

export async function quoteCart(items: CartItem[]): Promise<QuoteCartResult> {
  const profile = await requireRole("parent");
  const prepared = await prepareCart(items, profile);
  if (!prepared.success) return prepared;

  return {
    success: true,
    lines: prepared.lines.map((line) => ({
      id: line.itemId,
      title: line.title,
      listTotal: line.listTotal,
      participantNames: line.participantNames,
    })),
    subtotal: prepared.subtotal,
    installmentsMax: prepared.installmentsMax,
  };
}

export async function previewCartCoupon(input: {
  code: string;
  items: CartItem[];
}): Promise<
  { success: true; coupon: AppliedCoupon } | { success: false; error: string }
> {
  const profile = await requireRole("parent");
  const code = normalizeCouponCode(input.code);
  if (!isValidCouponCode(code)) {
    return { success: false, error: "נא להזין קוד קופון תקין." };
  }

  const prepared = await prepareCart(input.items, profile);
  if (!prepared.success) return prepared;

  const { data, error } = await prepared.supabase.rpc("preview_coupon", {
    p_code: code,
    p_amount: prepared.subtotal,
    ...couponArgsForLines(prepared.lines),
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

export async function checkoutCart(input: {
  items: CartItem[];
  paymentMethod: CheckoutPaymentMethod;
  couponCode?: string | null;
  receiptLabelId?: string | null;
  abandonCheckoutId?: string | null;
}): Promise<CheckoutCartResult> {
  const profile = await requireRole("parent");
  const { paymentMethod } = input;

  if (input.abandonCheckoutId) {
    const abandoned = await releaseAbandonedCartCheckout(input.abandonCheckoutId);
    if (abandoned.paid) {
      return {
        success: false,
        paid: true,
        error: "התשלום כבר התקבל. רעננו את העמוד.",
      };
    }
  }

  if (!ALLOWED_METHODS.includes(paymentMethod)) {
    return { success: false, error: "אמצעי התשלום שנבחר אינו נתמך." };
  }

  const prepared = await prepareCart(input.items, profile);
  if (!prepared.success) return prepared;

  const { supabase, lines, subtotal, installmentsMax } = prepared;
  const deferred = isDeferredPaymentMethod(paymentMethod);

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
        p_amount: subtotal,
        ...couponArgsForLines(lines),
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

  async function releaseCoupon() {
    if (redemptionId) {
      await supabase.rpc("release_coupon", { p_redemption_id: redemptionId });
    }
  }

  const receiptLabel = await resolveReceiptLabelForCheckout(
    supabase,
    input.receiptLabelId
  );
  if (!receiptLabel.ok) {
    await releaseCoupon();
    return { success: false, error: receiptLabel.error };
  }

  const totalAmount = Math.max(round2(subtotal - couponDiscount), 0);
  const awaitingCardcom = !deferred && totalAmount > 0;
  const paidAt = new Date().toISOString();
  const paymentStatus =
    deferred || awaitingCardcom ? ("unpaid" as const) : ("paid" as const);
  const chargeStatus =
    deferred || awaitingCardcom ? ("pending" as const) : ("paid" as const);

  const allAmounts = allocateDiscount(
    lines.flatMap((line) => line.paymentAmounts),
    couponDiscount
  );

  const createdEnrollmentIds: string[] = [];
  const createdPaymentIds: string[] = [];
  let amountIndex = 0;

  try {
    for (const line of lines) {
      const rows = line.enrollmentRows.map((row) => ({
        ...row,
        payment_status: paymentStatus,
      }));

      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert(rows)
        .select("id, child_id");

      if (enrollmentError || !enrollments?.length) {
        throw new Error(
          enrollmentError?.code === "23505"
            ? `אחד מהתורים ב${line.title} כבר תפוס. רעננו ובחרו תור אחר.`
            : `לא הצלחנו לשמור את ${line.title}.`
        );
      }
      createdEnrollmentIds.push(...enrollments.map((row) => row.id));

      if (line.privateLessonQuantity && line.planId) {
        const slotRows = enrollments.flatMap((enrollment) =>
          Array.from({ length: line.privateLessonQuantity! }, () => ({
            enrollment_id: enrollment.id,
            parent_id: profile.id,
            child_id: enrollment.child_id,
            private_lesson_id: line.planId!,
            status: "awaiting_schedule" as const,
          }))
        );
        const { error: slotsError } = await supabase
          .from("private_lesson_slots")
          .insert(slotRows);
        if (slotsError) {
          throw new Error(`לא הצלחנו לשריין את השיעורים ב${line.title}.`);
        }
      }

      if (line.activityQuantity && line.planId) {
        const { error: bookingError } = await supabase
          .from("activity_bookings")
          .insert(
            enrollments.map((enrollment) => ({
              enrollment_id: enrollment.id,
              parent_id: profile.id,
              child_id: enrollment.child_id,
              program_id: line.planId!,
              people_count: line.activityQuantity ?? 1,
              status: "awaiting_schedule" as const,
            }))
          );
        if (bookingError) {
          throw new Error(`לא הצלחנו לשריין את ${line.title}.`);
        }
      }

      const description =
        receiptLabel.description ??
        (lines.length === 1
          ? line.chargeDescription
          : `רכישה מרוכזת · ${line.title}`);

      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .insert(
          enrollments.map((enrollment, index) => {
            const amount = allAmounts[amountIndex + index] ?? 0;
            return {
              parent_id: profile.id,
              enrollment_id: enrollment.id,
              amount,
              payment_method: paymentMethod,
              status: chargeStatus,
              paid_at: deferred || awaitingCardcom ? null : paidAt,
              receipt_label_id: receiptLabel.labelId,
              receipt_description: description,
            };
          })
        )
        .select("id");

      if (paymentError || !payments?.length) {
        throw new Error(`הרכישה נשמרה אך רישום התשלום ל${line.title} נכשל.`);
      }
      createdPaymentIds.push(...payments.map((row) => row.id));
      amountIndex += enrollments.length;
    }

    if (redemptionId && createdEnrollmentIds[0]) {
      await supabase.rpc("link_coupon_redemption", {
        p_redemption_id: redemptionId,
        p_enrollment_id: createdEnrollmentIds[0],
      });
    }
  } catch (error) {
    if (createdPaymentIds.length) {
      await supabase.from("payments").delete().in("id", createdPaymentIds);
    }
    if (createdEnrollmentIds.length) {
      await supabase
        .from("private_lesson_slots")
        .delete()
        .in("enrollment_id", createdEnrollmentIds);
      await supabase
        .from("activity_bookings")
        .delete()
        .in("enrollment_id", createdEnrollmentIds);
      await supabase.from("enrollments").delete().in("id", createdEnrollmentIds);
    }
    await releaseCoupon();
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "לא הצלחנו להשלים את הרכישה. נסו שוב.",
    };
  }

  const description =
    receiptLabel.description ??
    (lines.length === 1
      ? lines[0].chargeDescription
      : `רכישה מרוכזת (${lines.length} פריטים)`);

  let checkoutUrl: string | null = null;
  let chargeCheckoutId: string | null = null;

  if (awaitingCardcom) {
    const charge = await getPaymentProvider().createCharge({
      amount: totalAmount,
      description,
      parentId: profile.id,
      method: paymentMethod,
      paymentIds: createdPaymentIds,
      couponRedemptionId: redemptionId,
      metadata: { cart: true, itemIds: lines.map((line) => line.itemId) },
      installments: installmentOptions(installmentsMax),
    });

    if (!charge.success || !charge.redirectUrl) {
      await supabase.from("payments").delete().in("id", createdPaymentIds);
      await supabase
        .from("private_lesson_slots")
        .delete()
        .in("enrollment_id", createdEnrollmentIds);
      await supabase
        .from("activity_bookings")
        .delete()
        .in("enrollment_id", createdEnrollmentIds);
      await supabase.from("enrollments").delete().in("id", createdEnrollmentIds);
      await releaseCoupon();
      return {
        success: false,
        error: charge.error || "לא הצלחנו לפתוח את דף התשלום. נסו שוב.",
      };
    }
    checkoutUrl = charge.redirectUrl;
    chargeCheckoutId = charge.checkoutId ?? null;
  }

  if (deferred && totalAmount > 0) {
    await notifyAdminPayment({
      paid: false,
      parentName: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      product: description,
      amount: totalAmount,
      paymentMethod,
      participants: [...new Set(lines.flatMap((line) => line.participantNames))],
    });
  }

  return {
    success: true,
    checkoutUrl,
    checkoutId: chargeCheckoutId,
    deferred,
    total: totalAmount,
    couponCode,
    couponDiscount,
  };
}
