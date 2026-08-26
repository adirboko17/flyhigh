"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { Modal } from "@/components/ui/Modal";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  BankTransferDetails,
  CardcomRedirectHint,
  CouponField,
  PaymentMethodPicker,
} from "@/components/checkout/CheckoutFields";
import { ReceiptLabelField } from "@/components/checkout/ReceiptLabelField";
import {
  DEFERRED_PAYMENT_HINT,
  PAYMENT_METHOD,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import type { AppliedCoupon } from "@/lib/finance/coupon";
import {
  calculateOrderTotal,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import {
  EMPTY_RECEIPT_LABEL_CHOICE,
  type ReceiptLabelChoice,
} from "@/lib/receipt-labels";
import {
  classInstallmentsMax,
  parseBillingMonths,
} from "@/lib/finance/classPricing";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import { PARENT_TRAINEE_ID } from "@/lib/enrollment/trainees";
import { formatCurrency, formatDate } from "@/utils/format";
import {
  completeClassEnrollmentPayment,
  previewClassCoupon,
  type CheckoutPaymentMethod,
} from "@/lib/enrollment/actions";
import { ClassLateRegistrationBanner } from "./ClassPrice";

type Child = { id: string; full_name: string };

interface ClassEnrollmentCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  classTitle: string;
  unitPrice: number;
  proration: ProratedClassPrice;
  billingMonths?: number | null;
  selectedChildren: Child[];
  includeSelf?: boolean;
  siblingTiers: SiblingDiscountTier[];
  /** אחים שכבר רשומים לאותה קטגוריה — נספרים למדרגת ההנחה. */
  enrolledSiblings: number;
  weeklySlotId?: string | null;
  weeklySlotLabel?: string | null;
}

export function ClassEnrollmentCheckoutDialog({
  open,
  onClose,
  classId,
  classTitle,
  unitPrice,
  proration,
  billingMonths,
  selectedChildren,
  includeSelf = false,
  siblingTiers,
  enrolledSiblings,
  weeklySlotId,
  weeklySlotLabel,
}: ClassEnrollmentCheckoutDialogProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [step, setStep] = useState<"summary" | "payment" | "added" | "success">(
    "summary"
  );
  const [method, setMethod] = useState<CheckoutPaymentMethod>("credit_card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [settledLater, setSettledLater] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [receiptLabel, setReceiptLabel] = useState<ReceiptLabelChoice>(
    EMPTY_RECEIPT_LABEL_CHOICE
  );

  const months = parseBillingMonths(billingMonths);
  const installmentsMax = classInstallmentsMax(billingMonths);
  const childIds = selectedChildren
    .map((child) => child.id)
    .filter((id) => id !== PARENT_TRAINEE_ID);
  const selfSelected =
    includeSelf || selectedChildren.some((child) => child.id === PARENT_TRAINEE_ID);
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
    setReceiptLabel(EMPTY_RECEIPT_LABEL_CHOICE);
    onClose();
  }

  async function handleApplyCoupon() {
    setCouponError(null);
    setCouponLoading(true);

    const result = await previewClassCoupon({
      code: couponInput,
      classId,
      childIds,
      includeSelf: selfSelected,
      weeklySlotId,
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

  function handleAddToCart() {
    setError(null);
    const result = addItem({
      kind: "class",
      productId: classId,
      title: classTitle,
      listTotal: order.total,
      childIds,
      includeSelf: selfSelected,
      participantNames: selectedChildren.map((child) => child.full_name),
      weeklySlotId,
      weeklySlotLabel,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep("added");
  }

  async function handlePay() {
    setError(null);

    if (receiptLabel.enabled && !receiptLabel.labelId) {
      setError("נא לבחור מה לרשום על הקבלה, או לבטל את הבקשה לפרטים שונים.");
      return;
    }

    setLoading(true);

    const result = await completeClassEnrollmentPayment({
      classId,
      childIds,
      includeSelf: selfSelected,
      paymentMethod: method,
      couponCode: coupon?.code ?? null,
      receiptLabelId: receiptLabel.enabled ? receiptLabel.labelId : null,
      weeklySlotId,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
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
          : step === "added"
            ? "נוסף לסל"
            : step === "payment"
              ? "אמצעי תשלום"
              : "סיכום הרשמה"
      }
      description={
        step === "success"
          ? settledLater
            ? "נרשמתם לחוג. התשלום ייגבה מול המשרד."
            : "נרשמתם לחוג וקיבלתם אישור תשלום."
          : step === "added"
            ? "אפשר להמשיך לחוג או כרטיסייה נוספים, ולשלם פעם אחת בסל."
            : step === "payment"
              ? "בחרו כיצד תרצו לשלם."
              : `בדקו את פרטי ההרשמה ל${classTitle} לפני ההוספה לסל.`
      }
    >
      {step === "summary" && (
        <div className="space-y-5">
          <ClassLateRegistrationBanner proration={proration} />

          <div className="rounded-2xl bg-ink-50 p-4">
            {weeklySlotLabel && (
              <p className="mb-3 text-sm font-semibold text-brand-800">
                מועד: {weeklySlotLabel}
              </p>
            )}
            <p className="text-sm font-semibold text-ink-700">מתאמנים להרשמה</p>
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

          <ReceiptLabelField
            productTitle={classTitle}
            value={receiptLabel}
            onChange={setReceiptLabel}
          />

          <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            {months && !proration.isLate && (
              <>
                <div className="flex justify-between gap-3 text-ink-600">
                  <span>מחיר לחודש</span>
                  <span className="shrink-0">
                    {formatCurrency(proration.fullPrice / months)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-ink-600">
                  <span>{months} חודשים</span>
                  <span className="shrink-0">
                    {formatCurrency(proration.fullPrice)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink-500">
                  אי אפשר לרכוש חודש בודד — החיוב הוא על כל התקופה, עם אפשרות
                  לפריסה בתשלומים בדף הסליקה.
                </p>
              </>
            )}
            {proration.isLate && (
              <>
                <div className="flex justify-between gap-3 text-ink-500">
                  <span>מחיר מלא לתקופה</span>
                  <span className="shrink-0 line-through">
                    {formatCurrency(proration.fullPrice)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-ink-600">
                  <span>
                    נרשמים ממפגש {proration.firstSessionNumber} מתוך{" "}
                    {proration.billableCount}
                    {proration.firstRemainingDate
                      ? ` · ${formatDate(proration.firstRemainingDate)}`
                      : ""}
                  </span>
                  <span className="shrink-0">
                    {proration.remainingCount} ×{" "}
                    {formatCurrency(proration.pricePerSession)}
                  </span>
                </div>
              </>
            )}
            {(!months || proration.isLate) && (
              <div className="flex justify-between gap-3 text-ink-600">
                <span>
                  {proration.isLate ? "מחיר למתאמן/ת מעכשיו" : "מחיר למתאמן/ת"}
                </span>
                <span className="shrink-0">{formatCurrency(unitPrice)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 text-ink-600">
              <span>כמות מתאמנים</span>
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
                  הנחת בני משפחה {order.percent}% על הילד השני ומעלה
                  {order.discountedChildren > 0 && (
                    <span className="ms-1 text-xs font-normal text-ink-400">
                      ({order.discountedChildren} ילדים בהנחה
                      {enrolledSiblings > 0
                        ? ` · ${order.childCount} רשומים לקטגוריה`
                        : ""}
                      )
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
              onClick={handleAddToCart}
            >
              הוספה לסל
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-center text-sm font-semibold text-ink-500 underline-offset-2 hover:text-brand-700 hover:underline"
            onClick={() => setStep("payment")}
          >
            תשלום מיידי לחוג הזה בלבד
          </button>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {step === "added" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aqua-100 text-3xl">
            ✓
          </div>
          <p className="font-semibold text-ink-900">
            {classTitle} נוסף לסל עבור {count}{" "}
            {count === 1 ? "מתאמן/ת" : "מתאמנים"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="sm:flex-1" onClick={handleClose}>
              המשך לקנות
            </Button>
            <ButtonLink href="/cart" className="sm:flex-1">
              לעגלת הקניות
            </ButtonLink>
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
              {count} {count === 1 ? "מתאמן/ת" : "מתאמנים"} · {classTitle}
              {proration.isLate &&
                ` · ממפגש ${proration.firstSessionNumber} מתוך ${proration.billableCount}`}
              {order.percent > 0 &&
                ` · כולל ${order.percent}% הנחת בני משפחה על הילד השני ומעלה`}
              {couponDiscount > 0 && ` · כולל קופון ${coupon?.code}`}
            </p>
          </div>

          <PaymentMethodPicker
            value={method}
            onChange={setMethod}
            disabled={loading}
          />

          {deferred ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">התשלום לא ייגבה עכשיו</p>
              <p className="mt-1">
                {DEFERRED_PAYMENT_HINT[method]} ההרשמה נשמרת מיד והמקום בחוג נשמר
                לכם.
              </p>
              {method === "bank_transfer" && (
                <BankTransferDetails className="mt-3" />
              )}
            </div>
          ) : nothingToCharge ? (
            <div className="rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
              <p className="font-semibold">אין מה לשלם</p>
              <p className="mt-1">
                הקופון מכסה את מלוא הסכום, ולכן לא יבוצע חיוב.
              </p>
            </div>
          ) : (
            <CardcomRedirectHint installmentsMax={installmentsMax} />
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
                  : "מעביר לקארדקום..."
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
                : `${count} מתאמנים נרשמו לחוג`}
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

