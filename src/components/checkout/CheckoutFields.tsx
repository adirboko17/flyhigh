"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { DEFERRED_PAYMENT_METHODS, PAYMENT_METHOD } from "@/lib/constants";
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

export function DemoCardFields() {
  const cardId = useId();
  const expiryId = useId();
  const cvvId = useId();

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400">זהו מסך דמו — לא מתבצע חיוב אמיתי.</p>
      <Field label="מספר כרטיס" htmlFor={cardId}>
        <Input id={cardId} dir="ltr" defaultValue="4580 0000 0000 0001" readOnly />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="תוקף" htmlFor={expiryId}>
          <Input id={expiryId} dir="ltr" defaultValue="12/28" readOnly />
        </Field>
        <Field label="CVV" htmlFor={cvvId}>
          <Input id={cvvId} dir="ltr" defaultValue="123" readOnly />
        </Field>
      </div>
    </div>
  );
}
