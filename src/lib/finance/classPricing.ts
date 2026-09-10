/**
 * תמחור חוג: או סכום לתקופה, או מחיר לחודש × מספר חודשים.
 * מספר התשלומים באשראי נפרד מהמחיר — גם חוג במחיר לתקופה נפרס.
 */

import {
  CARDCOM_MAX_INSTALLMENTS,
  installmentOptions,
} from "@/lib/finance/installments";

/** ברירת מחדל לכל החוגים. אירובי נשאר 11 דרך billing_months הישן. */
export const DEFAULT_CLASS_INSTALLMENTS = 10;

export { CARDCOM_MAX_INSTALLMENTS };

export function parseBillingMonths(
  value: number | null | undefined
): number | null {
  const months = Math.floor(Number(value));
  if (!Number.isFinite(months) || months < 2 || months > 12) return null;
  return months;
}

export function parseInstallmentsMax(
  value: number | string | null | undefined
): number | null {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > CARDCOM_MAX_INSTALLMENTS) {
    return null;
  }
  return n;
}

export function classPeriodTotal(
  price: number,
  billingMonths?: number | null
): number {
  const months = parseBillingMonths(billingMonths);
  const unit = Number.isFinite(price) ? Math.max(price, 0) : 0;
  return months ? Math.round(unit * months * 100) / 100 : unit;
}

/** מחיר מועד — דריסה למועד ספציפי, אחרת מחיר החוג לתקופה. */
export function classSlotPeriodPrice(
  classPrice: number,
  billingMonths?: number | null,
  slotPrice?: number | null
): number {
  if (slotPrice != null && Number.isFinite(Number(slotPrice))) {
    return Math.max(0, Number(slotPrice));
  }
  return classPeriodTotal(classPrice, billingMonths);
}

export function classInstallmentsMax(
  billingMonths?: number | null,
  installmentsMax?: number | null
) {
  return (
    parseInstallmentsMax(installmentsMax) ??
    parseBillingMonths(billingMonths) ??
    DEFAULT_CLASS_INSTALLMENTS
  );
}

export function classInstallmentOptions(
  billingMonths?: number | null,
  installmentsMax?: number | null
) {
  return installmentOptions(
    classInstallmentsMax(billingMonths, installmentsMax)
  );
}
