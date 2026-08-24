/**
 * תמחור חוג: או סכום לתקופה, או מחיר לחודש × מספר חודשים.
 * כשמגדירים חודשים, הלקוח משלם על כל התקופה ואפשר לפרוס בדף קארדקום.
 */

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

export function classInstallmentOptions(billingMonths?: number | null) {
  const months = parseBillingMonths(billingMonths);
  if (!months) return null;
  return { min: 1, max: months, selected: months };
}
