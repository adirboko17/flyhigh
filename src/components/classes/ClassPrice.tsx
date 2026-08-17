import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

export function classPriceLabel(proration: ProratedClassPrice): string {
  if (proration.hasEnded) return "החוג הסתיים";
  if (proration.isLate) return "מחיר מעכשיו";
  return "מחיר";
}

export function ClassPriceAmount({
  proration,
  soldOut = false,
  size = "card",
}: {
  proration: ProratedClassPrice;
  soldOut?: boolean;
  size?: "card" | "panel";
}) {
  const amountClass =
    size === "panel"
      ? "font-display text-3xl font-extrabold sm:text-4xl"
      : "font-display text-[26px] font-extrabold leading-none tabular-nums";

  if (proration.hasEnded) {
    return (
      <p className={cn(amountClass, "text-ink-400")}>
        {formatCurrency(proration.fullPrice)}
      </p>
    );
  }

  if (!proration.isLate) {
    return (
      <p
        className={cn(amountClass, soldOut ? "text-ink-400" : "text-brand-700")}
      >
        {formatCurrency(proration.unitPrice)}
      </p>
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
}: {
  proration: ProratedClassPrice;
  compact?: boolean;
}) {
  if (proration.hasEnded) {
    return (
      <p className={cn("text-ink-500", compact ? "text-xs" : "text-sm")}>
        כל המפגשים כבר התקיימו
      </p>
    );
  }

  if (!proration.isLate || proration.billableCount === 0) return null;

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
