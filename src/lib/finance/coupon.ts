import type { Enums } from "@/types/database.types";
import { formatCurrency, formatDateShort } from "@/utils/format";

/**
 * קוד קופון. ההנחה חלה על סכום ההזמנה אחרי הנחת האחים, כך ששתי ההנחות מצטברות.
 * החישוב כאן חייב להישאר זהה לפונקציה coupon_discount_amount במסד הנתונים,
 * שהיא המקור הקובע בעת ההרשמה בפועל.
 */

export type CouponDiscountType = Enums<"coupon_discount_type">;

/** קופון שאומת מול השרת וכבר חושב מול סכום ההזמנה. */
export type AppliedCoupon = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  discountAmount: number;
};

export const COUPON_CODE_MIN_LENGTH = 3;
export const COUPON_CODE_MAX_LENGTH = 32;

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().slice(0, COUPON_CODE_MAX_LENGTH);
}

export function isValidCouponCode(code: string): boolean {
  const normalized = code.trim();
  return (
    normalized.length >= COUPON_CODE_MIN_LENGTH &&
    normalized.length <= COUPON_CODE_MAX_LENGTH
  );
}

/** הנחה קבועה לעולם לא תעלה על גובה החיוב. */
export function couponDiscountAmount(
  discountType: CouponDiscountType,
  discountValue: number,
  amount: number
): number {
  if (!(amount > 0) || !(discountValue > 0)) return 0;

  const raw =
    discountType === "percent" ? (amount * discountValue) / 100 : discountValue;

  return Math.max(Math.min(round2(raw), round2(amount)), 0);
}

export function describeCouponDiscount(
  discountType: CouponDiscountType,
  discountValue: number
): string {
  return discountType === "percent"
    ? `${discountValue}% הנחה`
    : `${formatCurrency(discountValue)} הנחה`;
}

export type CouponState =
  | "active"
  | "scheduled"
  | "expired"
  | "exhausted"
  | "disabled";

export type CouponSchedule = {
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  max_uses: number | null;
  used_count: number;
};

/** @param today תאריך "YYYY-MM-DD" לפי שעון ישראל, מחושב בשרת. */
export function couponState(coupon: CouponSchedule, today: string): CouponState {
  if (!coupon.is_active) return "disabled";
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return "exhausted";
  }
  if (coupon.starts_on && today < coupon.starts_on) return "scheduled";
  if (coupon.ends_on && today > coupon.ends_on) return "expired";
  return "active";
}

export const COUPON_STATE: Record<CouponState, { label: string; tone: BadgeTone }> =
  {
    active: { label: "פעיל", tone: "success" },
    scheduled: { label: "טרם התחיל", tone: "info" },
    expired: { label: "פג תוקף", tone: "neutral" },
    exhausted: { label: "מוצה", tone: "warning" },
    disabled: { label: "כבוי", tone: "danger" },
  };

export function describeCouponWindow(
  startsOn: string | null,
  endsOn: string | null
): string {
  if (!startsOn && !endsOn) return "ללא הגבלת תאריך";
  if (startsOn && endsOn) {
    return `${formatDateShort(startsOn)} – ${formatDateShort(endsOn)}`;
  }
  if (startsOn) return `מ־${formatDateShort(startsOn)}`;
  return `עד ${formatDateShort(endsOn)}`;
}

export function describeCouponUsage(
  usedCount: number,
  maxUses: number | null
): string {
  return maxUses === null ? `${usedCount} · ללא הגבלה` : `${usedCount} מתוך ${maxUses}`;
}
