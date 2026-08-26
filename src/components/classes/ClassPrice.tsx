import { parseBillingMonths } from "@/lib/finance/classPricing";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

export function classPriceLabel(
  proration: ProratedClassPrice,
  billingMonths?: number | null,
  interestOnly?: boolean
): string {
  if (interestOnly) return "הרשמה";
  if (proration.hasEnded) return "החוג הסתיים";
  if (proration.isLate) return "מחיר מעכשיו";
  if (parseBillingMonths(billingMonths)) return "מחיר לחודש";
  return "מחיר";
}

export function ClassPriceAmount({
  proration,
  soldOut = false,
  size = "card",
  billingMonths,
  interestOnly = false,
}: {
  proration: ProratedClassPrice;
  soldOut?: boolean;
  size?: "card" | "panel";
  billingMonths?: number | null;
  interestOnly?: boolean;
}) {
  const months = parseBillingMonths(billingMonths);
  const amountClass =
    size === "panel"
      ? "font-display text-3xl font-extrabold sm:text-4xl"
      : "font-display text-[26px] font-extrabold leading-none tabular-nums";
  const monthlyPrice = months
    ? Math.round((proration.fullPrice / months) * 100) / 100
    : null;

  if (interestOnly) {
    return (
      <p className={cn(amountClass, soldOut ? "text-ink-400" : "text-brand-700")}>
        ללא תשלום
      </p>
    );
  }

  if (proration.hasEnded) {
    return (
      <p className={cn(amountClass, "text-ink-400")}>
        {formatCurrency(proration.fullPrice)}
      </p>
    );
  }

  if (!proration.isLate) {
    return (
      <div>
        <p
          className={cn(amountClass, soldOut ? "text-ink-400" : "text-brand-700")}
        >
          {formatCurrency(monthlyPrice ?? proration.unitPrice)}
        </p>
        {monthlyPrice != null && (
          <p
            className={cn(
              "font-semibold",
              size === "panel" ? "mt-0.5 text-sm" : "text-[11px] leading-tight",
              soldOut ? "text-ink-400" : "text-ink-500"
            )}
          >
            לחודש
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-ink-400 line-through">
        {formatCurrency(proration.fullPrice)}
      </p>
      <p
        className={cn(amountClass, soldOut ? "text-ink-400" : "text-brand-700")}
      >
        {formatCurrency(proration.unitPrice)}
      </p>
    </div>
  );
}

export function ClassPriceNote({
  proration,
  compact = false,
  billingMonths,
  interestOnly = false,
}: {
  proration: ProratedClassPrice;
  compact?: boolean;
  billingMonths?: number | null;
  interestOnly?: boolean;
}) {
  const months = parseBillingMonths(billingMonths);

  if (interestOnly) {
    return (
      <p className={cn("text-ink-500", compact ? "text-xs leading-snug" : "text-sm")}>
        בלי תאריך ובלי חיוב — רק הרשמה
      </p>
    );
  }

  if (proration.hasEnded) {
    return (
      <p className={cn("text-ink-500", compact ? "text-xs" : "text-sm")}>
        כל המפגשים כבר התקיימו
      </p>
    );
  }

  if (!proration.isLate) {
    if (months) {
      return (
        <p className={cn("text-ink-500", compact ? "text-xs leading-snug" : "text-sm")}>
          {compact
            ? `× ${months} חודשים · סה״כ ${formatCurrency(proration.fullPrice)}`
            : `× ${months} חודשים · סה״כ ${formatCurrency(proration.fullPrice)} · ניתן לפרוס בתשלומים`}
        </p>
      );
    }
    if (!compact) {
      return (
        <p className="text-sm text-ink-500">ניתן לפרוס בתשלומים באשראי</p>
      );
    }
    return null;
  }

  if (proration.billableCount === 0) return null;

  return (
    <p className={cn("text-ink-500", compact ? "text-xs leading-snug" : "text-sm")}>
      {compact
        ? `${proration.remainingCount} מפגשים שנותרו`
        : `נרשמים ממפגש ${proration.firstSessionNumber} מתוך ${proration.billableCount} · ${proration.remainingCount} מפגשים × ${formatCurrency(proration.pricePerSession)}`}
    </p>
  );
}

export function ClassLateRegistrationBanner({
  proration,
}: {
  proration: ProratedClassPrice;
}) {
  if (proration.hasEnded) {
    return (
      <p className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-600">
        החוג הסתיים
      </p>
    );
  }

  if (!proration.isLate) return null;

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      נרשמים ממפגש {proration.firstSessionNumber} מתוך {proration.billableCount}
    </p>
  );
}
