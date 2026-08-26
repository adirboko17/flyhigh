"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import {
  BankTransferDetails,
  CardcomRedirectHint,
  CouponField,
  PaymentMethodPicker,
} from "@/components/checkout/CheckoutFields";
import { ReceiptLabelField } from "@/components/checkout/ReceiptLabelField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons/Icon";
import {
  checkoutCart,
  previewCartCoupon,
  quoteCart,
  releaseAbandonedCartCheckout,
} from "@/lib/cart/actions";
import {
  readPendingCartCheckoutId,
  writePendingCartCheckoutId,
} from "@/lib/cart/pendingCheckout";
import type { CartItem } from "@/lib/cart/types";
import {
  DEFERRED_PAYMENT_HINT,
  isDeferredPaymentMethod,
} from "@/lib/constants";
import type { CheckoutPaymentMethod } from "@/lib/enrollment/actions";
import type { AppliedCoupon } from "@/lib/finance/coupon";
import {
  EMPTY_RECEIPT_LABEL_CHOICE,
  type ReceiptLabelChoice,
} from "@/lib/receipt-labels";
import { formatCurrency } from "@/utils/format";

type Viewer =
  | { kind: "guest" }
  | { kind: "other" }
  | { kind: "parent"; parentName: string };

function kindLabel(item: CartItem) {
  if (item.kind === "class") return "חוג";
  if (item.kind === "private_lesson") return "שיעור פרטי";
  if (item.kind === "pool_pass") {
    return item.entriesCount === 1 ? "כניסה" : "כרטיסייה";
  }
  if (item.programKind === "activity") return "פעילות";
  return "מנוי";
}

export function CartPageClient({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const { ready, items, removeItem, clear } = useCart();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof quoteCart>> | null>(
    null
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [method, setMethod] = useState<CheckoutPaymentMethod>("credit_card");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [receiptLabel, setReceiptLabel] = useState<ReceiptLabelChoice>(
    EMPTY_RECEIPT_LABEL_CHOICE
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"review" | "payment">("review");
  const [resumeTick, setResumeTick] = useState(0);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setResumeTick((value) => value + 1);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (!ready || viewer.kind !== "parent") {
      if (items.length === 0) setQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(items.length > 0);

    (async () => {
      const pendingId = readPendingCartCheckoutId();
      if (pendingId) {
        const abandoned = await releaseAbandonedCartCheckout(pendingId);
        if (cancelled) return;
        writePendingCartCheckoutId(null);
        if (abandoned.paid) {
          clear();
          setQuote(null);
          setQuoteLoading(false);
          return;
        }
      }

      if (items.length === 0) {
        setQuote(null);
        setQuoteLoading(false);
        return;
      }

      const result = await quoteCart(items);
      if (cancelled) return;
      setQuote(result);
      setQuoteLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, items, viewer.kind, clear, resumeTick]);

  useEffect(() => {
    setCoupon(null);
    setCouponError(null);
    setError(null);
    setStep("review");
  }, [items]);

  useEffect(() => {
    if (quote && !quote.success) setStep("review");
  }, [quote]);

  const subtotal =
    quote?.success ? quote.subtotal : items.reduce((sum, item) => sum + item.listTotal, 0);
  const couponDiscount = coupon?.discountAmount ?? 0;
  const total = Math.max(Math.round((subtotal - couponDiscount) * 100) / 100, 0);
  const deferred = isDeferredPaymentMethod(method);
  const installmentsMax = quote?.success ? quote.installmentsMax : null;

  async function handleApplyCoupon() {
    setCouponError(null);
    setCouponLoading(true);
    const result = await previewCartCoupon({ code: couponInput, items });
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
    const result = await checkoutCart({
      items,
      paymentMethod: method,
      couponCode: coupon?.code ?? null,
      receiptLabelId: receiptLabel.enabled ? receiptLabel.labelId : null,
      abandonCheckoutId: readPendingCartCheckoutId(),
    });
    setLoading(false);

    if (!result.success) {
      if (result.paid) {
        clear();
        writePendingCartCheckoutId(null);
      }
      setError(result.error);
      return;
    }

    if (result.checkoutUrl) {
      if (result.checkoutId) writePendingCartCheckoutId(result.checkoutId);
      window.location.assign(result.checkoutUrl);
      return;
    }

    clear();
    writePendingCartCheckoutId(null);
    router.push("/parent/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="h-48 animate-pulse rounded-3xl bg-white shadow-sm" />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="הסל ריק"
        description="בחרו חוג או כרטיסייה, סמנו את המתאמנים, והוסיפו לסל. אחר כך תשלמו כאן פעם אחת."
        icon={<Icon name="bag" size={22} />}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/classes">לחוגים</ButtonLink>
            <ButtonLink href="/programs" variant="outline">
              לבריכה
            </ButtonLink>
          </div>
        }
      />
    );
  }

  if (viewer.kind === "guest") {
    return (
      <div className="space-y-5">
        <CartItemsList items={items} onRemove={removeItem} />
        <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-sm">
          <p className="font-semibold text-ink-900">התחברו כדי לשלם</p>
          <p className="mt-1 text-sm text-ink-500">
            הסל נשמר במכשיר. אחרי ההתחברות תוכלו להשלים את התשלום כאן.
          </p>
          <ButtonLink href="/login?redirect=%2Fcart" className="mt-4">
            התחברות לתשלום
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (viewer.kind === "other") {
    return (
      <div className="space-y-5">
        <CartItemsList items={items} onRemove={removeItem} />
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          רכישות מהאתר מתבצעות מחשבון הורה.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CartItemsList items={items} onRemove={removeItem} />

      {quote && !quote.success ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {quote.error}
        </p>
      ) : null}

      <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2 text-sm">
          {quote?.success
            ? quote.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-ink-600">
                  <span className="min-w-0 truncate">{line.title}</span>
                  <span className="shrink-0">{formatCurrency(line.listTotal)}</span>
                </div>
              ))
            : items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-ink-600">
                  <span className="min-w-0 truncate">{item.title}</span>
                  <span className="shrink-0">{formatCurrency(item.listTotal)}</span>
                </div>
              ))}
          {couponDiscount > 0 && (
            <div className="flex justify-between gap-3 font-semibold text-aqua-700">
              <span>קופון {coupon?.code}</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-ink-100 pt-3 font-display text-lg font-extrabold text-brand-700">
            <span>סה״כ לתשלום</span>
            <span>{quoteLoading ? "..." : formatCurrency(total)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {step === "review" ? (
            <>
              <CouponField
                value={couponInput}
                onChange={setCouponInput}
                applied={coupon}
                loading={couponLoading}
                error={couponError}
                onApply={handleApplyCoupon}
                onRemove={() => {
                  setCoupon(null);
                  setCouponInput("");
                  setCouponError(null);
                }}
              />

              <Button
                type="button"
                className="w-full"
                disabled={quote != null && !quote.success}
                onClick={() => setStep("payment")}
              >
                המשך לתשלום
              </Button>
            </>
          ) : (
            <>
              <ReceiptLabelField
                productTitle={
                  items.length === 1 ? items[0].title : "רכישה מרוכזת"
                }
                value={receiptLabel}
                onChange={setReceiptLabel}
              />

              <PaymentMethodPicker
                value={method}
                onChange={setMethod}
                disabled={loading}
              />

              {deferred ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">התשלום לא ייגבה עכשיו</p>
                  <p className="mt-1">{DEFERRED_PAYMENT_HINT[method]}</p>
                  {method === "bank_transfer" && (
                    <BankTransferDetails className="mt-3" />
                  )}
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
                  onClick={() => setStep("review")}
                >
                  חזרה לסל
                </Button>
                <Button
                  type="button"
                  className="sm:flex-1"
                  disabled={loading || (quote != null && !quote.success)}
                  onClick={handlePay}
                >
                  {loading
                    ? deferred
                      ? "שומר רכישה..."
                      : "מעביר לקארדקום..."
                    : deferred
                      ? "אישור רכישה"
                      : `שלמו ${formatCurrency(total)}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CartItemsList({
  items,
  onRemove,
}: {
  items: CartItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-3xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-brand-600">
                {kindLabel(item)}
              </p>
              <p className="font-display text-lg font-bold text-ink-900">
                {item.title}
              </p>
              {item.weeklySlotLabel ? (
                <p className="mt-0.5 text-sm text-ink-500">{item.weeklySlotLabel}</p>
              ) : null}
              <p className="mt-1 text-sm text-ink-600">
                {item.participantNames.join(" · ")}
                {item.quantity && item.quantity > 1
                  ? ` · כמות ${item.quantity}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="font-display text-lg font-extrabold text-brand-700">
                {formatCurrency(item.listTotal)}
              </p>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-sm font-semibold text-ink-400 transition-colors hover:text-red-600"
              >
                הסרה
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
