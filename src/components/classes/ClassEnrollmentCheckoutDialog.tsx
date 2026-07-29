"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  DEFERRED_PAYMENT_HINT,
  DEFERRED_PAYMENT_METHODS,
  PAYMENT_METHOD,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import {
  normalizeCouponCode,
  type AppliedCoupon,
} from "@/lib/finance/coupon";
import {
  calculateOrderTotal,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import {
  completeClassEnrollmentPayment,
  previewClassCoupon,
  type CheckoutPaymentMethod,
} from "@/lib/enrollment/actions";

type Child = { id: string; full_name: string };

const METHOD_OPTIONS: CheckoutPaymentMethod[] = [
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
];

interface ClassEnrollmentCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  classTitle: string;
  unitPrice: number;
  selectedChildren: Child[];
  siblingTiers: SiblingDiscountTier[];
  /** אחים שכבר רשומים לחוג — נספרים למדרגת ההנחה. */
  enrolledSiblings: number;
}

export function ClassEnrollmentCheckoutDialog({
  open,
  onClose,
  classId,
  classTitle,
  unitPrice,
  selectedChildren,
  siblingTiers,
  enrolledSiblings,
}: ClassEnrollmentCheckoutDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"summary" | "payment" | "success">("summary");
  const [method, setMethod] = useState<CheckoutPaymentMethod>("credit_card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [settledLater, setSettledLater] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const count = selectedChildren.length;
  const order = calculateOrderTotal(
    unitPrice,
    count,
    siblingTiers,
    enrolledSiblings + count
  );
  const couponDiscount = coupon?.discountAmount ?? 0;
  const total = Math.max(Math.round((order.total - couponDiscount) * 100) / 100, 0);
  const deferred = isDeferredPaymentMethod(method);
  const nothingToCharge = total <= 0;

  function handleClose() {
    if (loading) return;
    setStep("summary");
    setMethod("credit_card");
    setError(null);
    setPaymentReference(null);
    setSettledLater(false);
    setCouponInput("");
    setCoupon(null);
    setCouponError(null);
    onClose();
  }

  async function handleApplyCoupon() {
    setCouponError(null);
    setCouponLoading(true);

    const result = await previewClassCoupon({
      code: couponInput,
      classId,
      childIds: selectedChildren.map((c) => c.id),
    });

    setCouponLoading(false);

    if (!result.success) {
      setCoupon(null);
      setCouponError(result.error);
      return;
    }

    setCoupon(result.coupon);
    setCouponInput(result.coupon.code);
  }

  function handleRemoveCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handlePay() {
    setError(null);
    setLoading(true);

    // השהיה קצרה כדי לדמות סליקה; בתשלום מול המשרד אין למה להמתין.
    if (!deferred && !nothingToCharge) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    const result = await completeClassEnrollmentPayment({
      classId,
      childIds: selectedChildren.map((c) => c.id),
      paymentMethod: method,
      couponCode: coupon?.code ?? null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPaymentReference(result.paymentReference);
    setSettledLater(result.deferred);
    setStep("success");
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "success"
          ? settledLater
            ? "ההרשמה נקלטה"
            : "התשלום הושלם בהצלחה"
          : step === "payment"
            ? "אמצעי תשלום"
            : "סיכום הרשמה"
      }
      description={
        step === "success"
          ? settledLater
            ? "הילדים נרשמו לחוג. התשלום ייגבה מול המשרד."
            : "הילדים נרשמו לחוג וקיבלתם אישור תשלום."
          : step === "payment"
            ? "בחרו כיצד תרצו לשלם."
            : `בדקו את פרטי ההרשמה ל${classTitle} לפני המעבר לתשלום.`
      }
    >
      {step === "summary" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-700">ילדים להרשמה</p>
            <ul className="mt-2 space-y-1.5">
              {selectedChildren.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate font-medium text-ink-900">
                    {child.full_name}
                  </span>
                  <span className="shrink-0 text-ink-500">
                    {formatCurrency(unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <CouponField
            value={couponInput}
            onChange={setCouponInput}
            applied={coupon}
            loading={couponLoading}
            error={couponError}
            onApply={handleApplyCoupon}
            onRemove={handleRemoveCoupon}
          />

          <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between gap-3 text-ink-600">
              <span>מחיר לילד/ה</span>
              <span className="shrink-0">{formatCurrency(unitPrice)}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink-600">
              <span>כמות ילדים</span>
              <span className="shrink-0">{count}</span>
            </div>
            {(order.percent > 0 || couponDiscount > 0) && (
              <div className="flex justify-between gap-3 text-ink-600">
                <span>סכום ביניים</span>
                <span className="shrink-0">{formatCurrency(order.listTotal)}</span>
              </div>
            )}
            {order.percent > 0 && (
              <div className="flex justify-between gap-3 font-semibold text-aqua-700">
                <span className="min-w-0">
                  הנחת אחים {order.percent}%
                  {enrolledSiblings > 0 && (
                    <span className="ms-1 text-xs font-normal text-ink-400">
                      ({order.childCount} ילדים רשומים לחוג)
                    </span>
                  )}
                </span>
                <span className="shrink-0">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}
            {coupon && couponDiscount > 0 && (
              <div className="flex justify-between gap-3 font-semibold text-aqua-700">
                <span className="min-w-0 break-all">
                  קופון
                  <span className="ms-1 font-mono text-xs" dir="ltr">
                    {coupon.code}
                  </span>
                </span>
                <span className="shrink-0">-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 font-display text-lg font-extrabold text-brand-700">
              <span>סה״כ לתשלום</span>
              <span className="shrink-0">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={handleClose}
            >
              ביטול
            </Button>
            <Button
              type="button"
              className="sm:flex-1"
              onClick={() => setStep("payment")}
            >
              המשך לתשלום
            </Button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <div className="flex justify-between gap-3 font-semibold text-brand-800">
              <span>לתשלום</span>
              <span className="shrink-0">{formatCurrency(total)}</span>
            </div>
            <p className="mt-1 break-words text-brand-700">
              {count} {count === 1 ? "ילד/ה" : "ילדים"} · {classTitle}
              {order.percent > 0 && ` · כולל ${order.percent}% הנחת אחים`}
              {couponDiscount > 0 && ` · כולל קופון ${coupon?.code}`}
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-ink-800">
              בחירת אמצעי תשלום
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {METHOD_OPTIONS.map((option) => {
                const selected = option === method;
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
                      name="payment-method"
                      value={option}
                      checked={selected}
                      onChange={() => setMethod(option)}
                      disabled={loading}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-300"
                    />
                    {PAYMENT_METHOD[option]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {deferred ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">התשלום לא ייגבה עכשיו</p>
              <p className="mt-1">
                {DEFERRED_PAYMENT_HINT[method]} ההרשמה נשמרת מיד והמקום בחוג נשמר
                לכם.
              </p>
            </div>
          ) : nothingToCharge ? (
            <div className="rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
              <p className="font-semibold">אין מה לשלם</p>
              <p className="mt-1">
                הקופון מכסה את מלוא הסכום, ולכן לא יבוצע חיוב.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-400">
                זהו מסך דמו — לא מתבצע חיוב אמיתי.
              </p>
              <Field label="מספר כרטיס" htmlFor="demo-card">
                <Input
                  id="demo-card"
                  dir="ltr"
                  defaultValue="4580 0000 0000 0001"
                  readOnly
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="תוקף" htmlFor="demo-expiry">
                  <Input id="demo-expiry" dir="ltr" defaultValue="12/28" readOnly />
                </Field>
                <Field label="CVV" htmlFor="demo-cvv">
                  <Input id="demo-cvv" dir="ltr" defaultValue="123" readOnly />
                </Field>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              disabled={loading}
              onClick={() => setStep("summary")}
            >
              חזרה
            </Button>
            <Button
              type="button"
              className="sm:flex-1"
              disabled={loading}
              onClick={handlePay}
            >
              {loading
                ? deferred || nothingToCharge
                  ? "שומר הרשמה..."
                  : "מעבד תשלום..."
                : deferred || nothingToCharge
                  ? "אישור הרשמה"
                  : `שלם ${formatCurrency(total)}`}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aqua-100 text-3xl">
            ✓
          </div>
          <div>
            <p className="font-semibold text-ink-900">
              {count === 1
                ? `${selectedChildren[0]?.full_name} נרשם/ה לחוג`
                : `${count} ילדים נרשמו לחוג`}
            </p>
            {settledLater ? (
              <p className="mt-1 text-sm text-ink-500">
                נותר לשלם {formatCurrency(total)} ב{PAYMENT_METHOD[method]}. החיוב
                מופיע באזור התשלומים שלכם עד להסדרתו.
              </p>
            ) : (
              paymentReference && (
                <p className="mt-1 text-xs text-ink-400" dir="ltr">
                  אישור: {paymentReference}
                </p>
              )
            )}
            {couponDiscount > 0 && (
              <p className="mt-1 text-sm font-medium text-aqua-700">
                הקופון חסך לכם {formatCurrency(couponDiscount)}.
              </p>
            )}
          </div>
          <Button type="button" className="w-full" onClick={handleClose}>
            סגירה
          </Button>
        </div>
      )}
    </Modal>
  );
}

function CouponField({
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
      <Field label="קוד קופון" htmlFor="coupon-code" hint="יש לכם קוד הנחה? הזינו אותו כאן.">
        <div className="flex gap-2">
          <Input
            id="coupon-code"
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
