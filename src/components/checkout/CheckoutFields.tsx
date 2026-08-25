"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  BANK_TRANSFER_ACCOUNT,
  DEFERRED_PAYMENT_METHODS,
  PAYMENT_METHOD,
} from "@/lib/constants";
import { normalizeCouponCode, type AppliedCoupon } from "@/lib/finance/coupon";
import type { CheckoutPaymentMethod } from "@/lib/enrollment/actions";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

/** אמצעי התשלום שמוצגים בצ׳קאאוט הציבורי — חוגים, מסלולים וכניסות. */
export const CHECKOUT_METHOD_OPTIONS: CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

export function CouponField({
  value,
  onChange,
  applied,
  loading,
  error,
  onApply,
  onRemove,
}: {
  value: string;
  onChange: (value: string) => void;
  applied: AppliedCoupon | null;
  loading: boolean;
  error: string | null;
  onApply: () => void;
  onRemove: () => void;
}) {
  const inputId = useId();

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-aqua-800">
            הקופון{" "}
            <span className="font-mono" dir="ltr">
              {applied.code}
            </span>{" "}
            הופעל
          </p>
          <p className="text-xs text-aqua-700">
            הנחה של {formatCurrency(applied.discountAmount)} מהסכום לתשלום
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-aqua-800 transition-colors hover:bg-aqua-100"
        >
          הסרה
        </button>
      </div>
    );
  }

  return (
    <div>
      <Field
        label="קוד קופון"
        htmlFor={inputId}
        hint="יש לכם קוד הנחה? הזינו אותו כאן."
      >
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={value}
            onChange={(e) => onChange(normalizeCouponCode(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              }
            }}
            placeholder="למשל SUMMER25"
            dir="ltr"
            className="min-w-0 text-right font-mono tracking-wider"
            disabled={loading}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={onApply}
            disabled={loading || value.trim().length === 0}
          >
            {loading ? "בודק..." : "החלה"}
          </Button>
        </div>
      </Field>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value: CheckoutPaymentMethod;
  onChange: (method: CheckoutPaymentMethod) => void;
  disabled?: boolean;
}) {
  const groupName = useId();

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-ink-800">
        בחירת אמצעי תשלום
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {CHECKOUT_METHOD_OPTIONS.map((option) => {
          const selected = option === value;
          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                disabled={disabled}
                className="h-4 w-4 text-brand-600 focus:ring-brand-300"
              />
              {PAYMENT_METHOD[option]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BankTransferDetails({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/80 bg-white/75 px-3.5 py-3 text-sm text-amber-950",
        className
      )}
    >
      <p className="font-semibold">{BANK_TRANSFER_ACCOUNT.title}</p>
      <ul className="mt-2 list-none space-y-1 p-0">
        <li>{BANK_TRANSFER_ACCOUNT.bank}</li>
        <li>סניף {BANK_TRANSFER_ACCOUNT.branch}</li>
        <li>חשבון {BANK_TRANSFER_ACCOUNT.account}</li>
        <li>{BANK_TRANSFER_ACCOUNT.holder}</li>
      </ul>
    </div>
  );
}

export function CardcomRedirectHint({
  installmentsMax,
}: {
  installmentsMax?: number | null;
}) {
  const months =
    installmentsMax && installmentsMax >= 2 ? Math.floor(installmentsMax) : null;

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      <p className="font-semibold">תשלום מאובטח בקארדקום</p>
      <p className="mt-1">
        בלחיצה תועברו לדף הסליקה של קארדקום להזנת כרטיס האשראי. אחרי התשלום
        תחזרו לאתר עם אישור, והחשבונית תופק אוטומטית.
      </p>
      {months ? (
        <p className="mt-2">
          החיוב הוא על כל התקופה. בדף הסליקה אפשר לפרוס עד {months} תשלומים
          (ברירת המחדל: {months} תשלומים).
        </p>
      ) : null}
    </div>
  );
}
