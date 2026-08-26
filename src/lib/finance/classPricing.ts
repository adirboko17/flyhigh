/**
 * תמחור חוג: או סכום לתקופה, או מחיר לחודש × מספר חודשים.
 * מספר התשלומים באשראי נפרד מהמחיר — גם חוג לתקופה (שחייה) נפרס.
 */

import { installmentOptions } from "@/lib/finance/installments";

/** ברירת מחדל לכל החוגים. אירובי נשאר 11 דרך billing_months. */
export const DEFAULT_CLASS_INSTALLMENTS = 10;

export function parseBillingMonths(
  value: number | null | undefined
): number | null {
  const months = Math.floor(Number(value));
  if (!Number.isFinite(months) || months < 2 || months > 12) return null;
  return months;
}

export function classPeriodTotal(
  price: number,
  billingMonths?: number | null
): number {
  const months = parseBillingMonths(billingMonths);
  const unit = Number.isFinite(price) ? Math.max(price, 0) : 0;
  return months ? Math.round(unit * months * 100) / 100 : unit;
}

export function classInstallmentsMax(billingMonths?: number | null) {
  return parseBillingMonths(billingMonths) ?? DEFAULT_CLASS_INSTALLMENTS;
}

export function classInstallmentOptions(billingMonths?: number | null) {
  return installmentOptions(classInstallmentsMax(billingMonths));
}
