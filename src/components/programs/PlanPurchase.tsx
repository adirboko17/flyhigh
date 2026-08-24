"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
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
import type { CheckoutPaymentMethod } from "@/lib/enrollment/actions";
import {
  completePlanPurchase,
  previewPlanCoupon,
  type PlanKind,
} from "@/lib/enrollment/planActions";
import {
  ACTIVITY_MAX_PEOPLE,
  isActivityProgram,
  type ProgramKind,
} from "@/lib/programs";
import {
  EMPTY_RECEIPT_LABEL_CHOICE,
  type ReceiptLabelChoice,
} from "@/lib/receipt-labels";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

type Child = { id: string; full_name: string };

/** מי מבקר בעמוד — קובע אם מוצג כפתור רכישה, התחברות או הפניה לאזור האישי. */
export type PlanViewer =
  | { kind: "guest" }
  | { kind: "other"; homeHref: string }
  | { kind: "parent"; parentName: string; children: Child[] };

interface PlanPurchaseButtonProps {
  planKind: PlanKind;
  planId: string;
  planTitle: string;
  price: number;
  /** מספר הכניסות בכרטיסייה — מוצג בסיכום הרכישה. */
  entriesCount?: number | null;
  /** משך שיעור פרטי בדקות. */
  durationMinutes?: number | null;
  /** מנוי או פעילות לפי נפשות — רלוונטי רק כש־planKind הוא program. */
  programKind?: ProgramKind;
  featured?: boolean;
  viewer: PlanViewer;
}

export function PlanPurchaseButton({
  planKind,
  planId,
  planTitle,
  price,
  entriesCount,
  durationMinutes,
  programKind,
  featured = false,
  viewer,
}: PlanPurchaseButtonProps) {
  const [open, setOpen] = useState(false);

  const ctaClass = featured
    ? "ah-btn ah-btn--lg ah-btn--block bg-white text-brand-700 hover:bg-white/95"
    : "hero-cta-primary ah-btn ah-btn--lg ah-btn--block";
  const noteClass = cn(
    "mt-2 text-center text-xs",
    featured ? "text-white/80" : "text-ink-500"
  );
  const noteLinkClass = cn(
    "font-bold underline",
    featured ? "text-white" : "text-brand-600"
  );

  const isActivity = isActivityProgram(programKind);
  const ctaLabel =
    planKind === "private_lesson"
      ? "רכישת שיעור פרטי"
      : isActivity
        ? "רכישת הפעילות"
        : planKind === "program"
          ? "רכישת המסלול"
          : "רכישת כניסות";
  const loginLabel =
    planKind === "private_lesson"
      ? "התחברות לרכישת שיעור"
      : isActivity
        ? "התחברות לרכישת פעילות"
        : planKind === "program"
          ? "התחברות לרכישת מסלול"
          : "התחברות לרכישה";

  if (viewer.kind === "guest") {
    return (
      <div>
        <Link href="/login?redirect=%2Fprograms" className={ctaClass}>
          {loginLabel}
        </Link>
        <p className={noteClass}>
          אין לכם משתמש?{" "}
          <Link href="/register" className={noteLinkClass}>
            הרשמה
          </Link>
        </p>
      </div>
    );
  }

  if (viewer.kind === "other") {
    return (
      <div>
        <Link
          href={viewer.homeHref}
          className={cn(
            "ah-btn ah-btn--lg ah-btn--block",
            featured
              ? "bg-white/15 text-white ring-1 ring-inset ring-white/40 hover:bg-white/25"
              : "ah-btn--outline"
          )}
        >
          חזרה לאזור האישי
        </Link>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={ctaClass} onClick={() => setOpen(true)}>
        {ctaLabel}
      </button>

      <PlanCheckoutDialog
        open={open}
        onClose={() => setOpen(false)}
        planKind={planKind}
        planId={planId}
        planTitle={planTitle}
        price={price}
        entriesCount={entriesCount}
        durationMinutes={durationMinutes}
        programKind={programKind}
        parentName={viewer.parentName}
        kids={viewer.children}
      />
    </>
  );
}

interface PlanPurchaseTriggerProps {
  planKind: PlanKind;
  planId: string;
  planTitle: string;
  price: number;
  entriesCount?: number | null;
  durationMinutes?: number | null;
  programKind?: ProgramKind;
  viewer: PlanViewer;
  children: ReactNode;
  className?: string;
}

/** עוטף כרטיס לחיץ שפותח את אותו דיאלוג רכישה כמו PlanPurchaseButton. */
export function PlanPurchaseTrigger({
  planKind,
  planId,
  planTitle,
  price,
  entriesCount,
  durationMinutes,
  programKind,
  viewer,
  children,
  className,
}: PlanPurchaseTriggerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleClick() {
    if (viewer.kind === "guest") {
      router.push("/login?redirect=%2Fprograms");
      return;
    }
    if (viewer.kind === "other") {
      router.push(viewer.homeHref);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "w-full cursor-pointer text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
          className
        )}
      >
        {children}
      </button>

      {viewer.kind === "parent" && (
        <PlanCheckoutDialog
          open={open}
          onClose={() => setOpen(false)}
          planKind={planKind}
          planId={planId}
          planTitle={planTitle}
          price={price}
          entriesCount={entriesCount}
          durationMinutes={durationMinutes}
          programKind={programKind}
          parentName={viewer.parentName}
          kids={viewer.children}
        />
      )}
    </>
  );
}

interface PlanCheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  planKind: PlanKind;
  planId: string;
  planTitle: string;
  price: number;
  entriesCount?: number | null;
  durationMinutes?: number | null;
  programKind?: ProgramKind;
  parentName: string;
  kids: Child[];
}

function PlanCheckoutDialog({
  open,
  onClose,
  planKind,
  planId,
  planTitle,
  price,
  entriesCount,
  durationMinutes,
  programKind,
  parentName,
  kids,
}: PlanCheckoutDialogProps) {
  const router = useRouter();
  const hasChildren = kids.length > 0;
  const isPrivateLesson = planKind === "private_lesson";
  const isActivity = isActivityProgram(programKind);
  const usesQuantity = isPrivateLesson || isActivity;

  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  // בלי ילדים בחשבון הרכישה תמיד נרשמת על שם ההורה, ולכן היא מסומנת מראש.
  const [includeSelf, setIncludeSelf] = useState(!hasChildren);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
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

  const participants = [
    ...selectedChildIds.map((id) => ({
      id,
      name: kids.find((child) => child.id === id)?.full_name ?? "",
    })),
    ...(includeSelf ? [{ id: "self", name: `${parentName} (אני)` }] : []),
  ];
  const count = participants.length;
  const effectiveQuantity = usesQuantity ? quantity : 1;
  const listTotal = isActivity
    ? Math.round(price * effectiveQuantity * 100) / 100
    : Math.round(price * effectiveQuantity * count * 100) / 100;
  const couponDiscount = coupon?.discountAmount ?? 0;
  const total = Math.max(Math.round((listTotal - couponDiscount) * 100) / 100, 0);
  const deferred = isDeferredPaymentMethod(method);
  const nothingToCharge = total <= 0;
  const kindLabel = isActivity
    ? "פעילות"
    : planKind === "program"
      ? "מסלול"
      : planKind === "private_lesson"
        ? "שיעור פרטי"
        : "כרטיסייה";

  /** שינוי המשתתפים משנה את בסיס החישוב, ולכן קופון שהוחל כבר אינו תקף. */
  function resetCoupon() {
    setCoupon(null);
    setCouponError(null);
  }

  function toggleChild(childId: string) {
    resetCoupon();
    setSelectedChildIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId]
    );
  }

  function toggleSelf() {
    resetCoupon();
    setIncludeSelf((current) => !current);
  }

  function handleClose() {
    if (loading) return;
    setStep("select");
    setMethod("credit_card");
    setError(null);
    setPaymentReference(null);
    setSettledLater(false);
    setCouponInput("");
    setCoupon(null);
    setCouponError(null);
    setReceiptLabel(EMPTY_RECEIPT_LABEL_CHOICE);
    setSelectedChildIds([]);
    setIncludeSelf(!hasChildren);
    setQuantity(1);
    onClose();
  }

  async function handleApplyCoupon() {
    setCouponError(null);
    setCouponLoading(true);

    const result = await previewPlanCoupon({
      code: couponInput,
      kind: planKind,
      planId,
      childIds: selectedChildIds,
      includeSelf,
      quantity: effectiveQuantity,
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

  async function handlePay() {
    setError(null);

    if (receiptLabel.enabled && !receiptLabel.labelId) {
      setError("נא לבחור מה לרשום על הקבלה, או לבטל את הבקשה לפרטים שונים.");
      return;
    }

    setLoading(true);

    const result = await completePlanPurchase({
      kind: planKind,
      planId,
      childIds: selectedChildIds,
      includeSelf,
      paymentMethod: method,
      couponCode: coupon?.code ?? null,
      quantity: effectiveQuantity,
      receiptLabelId: receiptLabel.enabled ? receiptLabel.labelId : null,
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
            ? "הרכישה נקלטה"
            : "התשלום הושלם בהצלחה"
          : step === "payment"
            ? "אמצעי תשלום"
            : `רכישת ${kindLabel}`
      }
      description={
        step === "success"
          ? settledLater
            ? `ה${kindLabel} נרשם בחשבון. התשלום ייגבה מול המשרד.`
            : `ה${kindLabel} נרשם בחשבון וקיבלתם אישור תשלום.`
          : step === "payment"
            ? "בחרו כיצד תרצו לשלם."
            : `בחרו למי מיועדת הרכישה של ${planTitle}.`
      }
    >
      {step === "select" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 font-display font-bold text-ink-900">
                {planTitle}
              </p>
              <p className="shrink-0 font-display font-extrabold text-brand-700">
                {formatCurrency(price)}
              </p>
            </div>
            {planKind === "pool_pass" && entriesCount ? (
              <p className="mt-0.5 text-sm text-ink-500">
                {entriesCount} כניסות לכל משתתף
              </p>
            ) : isPrivateLesson && durationMinutes ? (
              <p className="mt-0.5 text-sm text-ink-500">
                {durationMinutes} דקות לשיעור · מחיר לשיעור למשתתף
              </p>
            ) : isActivity ? (
              <p className="mt-0.5 text-sm text-ink-500">מחיר לנפש</p>
            ) : (
              <p className="mt-0.5 text-sm text-ink-500">מחיר לכל משתתף</p>
            )}
          </div>

          {(isPrivateLesson || isActivity) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">לפני הרכישה חשוב לדעת</p>
              <p className="mt-1">
                {isActivity
                  ? "בחרו כמה נפשות יגיעו. אחרי התשלום ניצור איתכם קשר לתיאום מועד. לא בוחרים תאריך בעמוד זה."
                  : "אחרי הרכישה ניצור איתכם קשר לתיאום תאריך ושעה לשיעור. לא בוחרים מועד בעמוד זה."}
              </p>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-800">
              למי הרכישה?
            </legend>
            <div className="space-y-2">
              <ParticipantOption
                label={`${parentName} (אני)`}
                hint="הרכישה תירשם על שמכם"
                checked={includeSelf}
                onChange={toggleSelf}
                disabled={!hasChildren}
              />
              {kids.map((child) => (
                <ParticipantOption
                  key={child.id}
                  label={child.full_name}
                  checked={selectedChildIds.includes(child.id)}
                  onChange={() => toggleChild(child.id)}
                />
              ))}
            </div>
            {!hasChildren && (
              <p className="mt-2 text-xs text-ink-500">
                אין ילדים בחשבון, ולכן הרכישה נרשמת על שמכם. אפשר להוסיף ילדים
                באזור האישי ולרכוש גם עבורם.
              </p>
            )}
          </fieldset>

          {usesQuantity && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-800">
                {isActivity ? "כמה נפשות?" : "כמה שיעורים?"}
              </legend>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 text-lg font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                  disabled={quantity <= 1}
                  onClick={() => {
                    resetCoupon();
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  aria-label="הפחתת כמות"
                >
                  −
                </button>
                <span className="min-w-[3rem] text-center font-display text-xl font-bold tabular-nums text-ink-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 text-lg font-bold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                  disabled={quantity >= ACTIVITY_MAX_PEOPLE}
                  onClick={() => {
                    resetCoupon();
                    setQuantity((q) => Math.min(ACTIVITY_MAX_PEOPLE, q + 1));
                  }}
                  aria-label="הוספת כמות"
                >
                  +
                </button>
                <span className="text-sm text-ink-500">
                  {isActivity ? "כולל ילדים, הורים ואורחים" : "לכל משתתף"}
                </span>
              </div>
            </fieldset>
          )}

          {count > 0 && (
            <CouponField
              value={couponInput}
              onChange={setCouponInput}
              applied={coupon}
              loading={couponLoading}
              error={couponError}
              onApply={handleApplyCoupon}
              onRemove={() => {
                setCouponInput("");
                resetCoupon();
              }}
            />
          )}

          {count > 0 && (
            <ReceiptLabelField
              productTitle={planTitle}
              value={receiptLabel}
              onChange={setReceiptLabel}
            />
          )}

          <div className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between gap-3 text-ink-600">
              <span>
                מחיר ל
                {isActivity
                  ? "נפש"
                  : planKind === "program"
                    ? "מסלול"
                    : planKind === "private_lesson"
                      ? "שיעור"
                      : "כרטיסייה"}
              </span>
              <span className="shrink-0">{formatCurrency(price)}</span>
            </div>
            {isPrivateLesson && (
              <div className="flex justify-between gap-3 text-ink-600">
                <span>כמות שיעורים</span>
                <span className="shrink-0">{quantity}</span>
              </div>
            )}
            {isActivity && (
              <div className="flex justify-between gap-3 text-ink-600">
                <span>נפשות</span>
                <span className="shrink-0">{quantity}</span>
              </div>
            )}
            {!isActivity && (
              <div className="flex justify-between gap-3 text-ink-600">
                <span>משתתפים</span>
                <span className="shrink-0">{count}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <>
                <div className="flex justify-between gap-3 text-ink-600">
                  <span>סכום ביניים</span>
                  <span className="shrink-0">{formatCurrency(listTotal)}</span>
                </div>
                <div className="flex justify-between gap-3 font-semibold text-aqua-700">
                  <span className="min-w-0 break-all">
                    קופון
                    <span className="ms-1 font-mono text-xs" dir="ltr">
                      {coupon?.code}
                    </span>
                  </span>
                  <span className="shrink-0">
                    -{formatCurrency(couponDiscount)}
                  </span>
                </div>
              </>
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
              disabled={count === 0}
              onClick={() => setStep("payment")}
            >
              {count === 0 ? "בחרו משתתפים" : "המשך לתשלום"}
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
              {planTitle}
              {isActivity
                ? ` · ${quantity} ${quantity === 1 ? "נפש" : "נפשות"}`
                : ` · ${count} ${count === 1 ? "משתתף/ת" : "משתתפים"}`}
              {isPrivateLesson &&
                ` · ${quantity} ${quantity === 1 ? "שיעור" : "שיעורים"}`}
              {couponDiscount > 0 && ` · כולל קופון ${coupon?.code}`}
            </p>
          </div>

          {(isPrivateLesson || isActivity) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {isActivity
                ? "ניצור איתכם קשר לתיאום מועד אחרי השלמת הרכישה."
                : "ניצור איתכם קשר לתיאום תאריך ושעה אחרי השלמת הרכישה."}
            </div>
          )}

          <PaymentMethodPicker
            value={method}
            onChange={setMethod}
            disabled={loading}
          />

          {deferred ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">התשלום לא ייגבה עכשיו</p>
              <p className="mt-1">
                {DEFERRED_PAYMENT_HINT[method]} הרכישה נרשמת מיד בחשבון שלכם.
              </p>
            </div>
          ) : nothingToCharge ? (
            <div className="rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
              <p className="font-semibold">אין מה לשלם</p>
              <p className="mt-1">הקופון מכסה את מלוא הסכום, ולכן לא יבוצע חיוב.</p>
            </div>
          ) : (
            <CardcomRedirectHint />
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
              onClick={() => setStep("select")}
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
                  ? "שומר רכישה..."
                  : "מעביר לקארדקום..."
                : deferred || nothingToCharge
                  ? "אישור רכישה"
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
              {planTitle} נוסף לחשבון שלכם
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {isActivity
                ? `${quantity} ${quantity === 1 ? "נפש" : "נפשות"}`
                : count === 1
                  ? `על שם ${participants[0]?.name}`
                  : `עבור ${count} משתתפים`}
              {isPrivateLesson &&
                ` · ${quantity} ${quantity === 1 ? "שיעור" : "שיעורים"}`}
            </p>
            {(isPrivateLesson || isActivity) && (
              <p className="mt-2 text-sm text-ink-500">
                {isActivity
                  ? "ניצור איתכם קשר בקרוב לתיאום מועד."
                  : "ניצור איתכם קשר בקרוב לתיאום תאריך ושעה."}
              </p>
            )}
            {settledLater ? (
              <p className="mt-2 text-sm text-ink-500">
                נותר לשלם {formatCurrency(total)} ב{PAYMENT_METHOD[method]}. החיוב
                מופיע באזור התשלומים שלכם עד להסדרתו.
              </p>
            ) : (
              paymentReference && (
                <p className="mt-2 text-xs text-ink-400" dir="ltr">
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="sm:flex-1"
              onClick={handleClose}
            >
              סגירה
            </Button>
            <Link
              href="/parent/dashboard#plans"
              className="ah-btn ah-btn--md ah-btn--primary sm:flex-1"
            >
              לאזור האישי
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ParticipantOption({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        disabled
          ? "cursor-default border-ink-100 bg-ink-50"
          : checked
            ? "cursor-pointer border-brand-500 bg-brand-50"
            : "cursor-pointer border-ink-200 bg-white hover:border-ink-300"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded text-brand-600 focus:ring-brand-300"
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-sm font-semibold",
            checked ? "text-brand-800" : "text-ink-800"
          )}
        >
          {label}
        </span>
        {hint && <span className="block text-xs text-ink-500">{hint}</span>}
      </span>
    </label>
  );
}
