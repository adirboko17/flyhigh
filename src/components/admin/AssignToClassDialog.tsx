"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminClassRow,
  AdminClassWaitlistEntry,
} from "@/components/admin/ClassList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { CardcomRedirectHint } from "@/components/checkout/CheckoutFields";
import { ReceiptLabelField } from "@/components/checkout/ReceiptLabelField";
import {
  assignChildrenToClass,
  assignWaitlistEntry,
  type AssignChargeMethod,
} from "@/lib/admin/assignment";
import { DEFERRED_PAYMENT_METHODS, PAYMENT_METHOD } from "@/lib/constants";
import {
  countFamilyChildrenInCategory,
  listFamilyChildrenInCategory,
} from "@/lib/enrollment/categorySiblings";
import {
  classInstallmentsMax,
  classPeriodTotal,
  parseBillingMonths,
} from "@/lib/finance/classPricing";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import { prorateClassPrice } from "@/lib/finance/proratedClassPrice";
import { isAppointmentClass } from "@/lib/classes/bookingMode";
import {
  calculateOrderTotal,
  loadFamilyDiscountSettings,
  parseSiblingTiers,
  siblingTiersForCheckout,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import {
  EMPTY_RECEIPT_LABEL_CHOICE,
  type ReceiptLabelChoice,
} from "@/lib/receipt-labels";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { calcAge, formatCurrency, formatDate, formatTime } from "@/utils/format";

function participantCountOf(childIds: string[], includeSelf: boolean) {
  return childIds.length + (includeSelf ? 1 : 0);
}

function assignSubmitLabel(
  count: number,
  includeSelf: boolean,
  paying: boolean
) {
  const noun = count <= 1 ? null : includeSelf ? "משתתפים" : "ילדים";
  if (paying) {
    return noun ? `שיבוץ ותשלום (${count} ${noun})` : "שיבוץ ותשלום";
  }
  return noun ? `שיבוץ ${count} ${noun}` : "שיבוץ לחוג";
}

type CustomerOption = {
  id: string;
  full_name: string;
  phone: string | null;
  children: { id: string; full_name: string; birth_date: string | null }[];
};

/** שיבוץ מרשימת ההמתנה (הלקוח והילד/ה ידועים) או שיבוץ ידני חופשי. */
export type AssignMode =
  | { kind: "waitlist"; entry: AdminClassWaitlistEntry }
  | { kind: "manual" };

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

/** פותחים כרטיסייה בלחיצה עצמה — אחרת הדפדפן חוסם חלון קופץ אחרי ה-await. */
function openCheckoutTab() {
  const tab = window.open("about:blank", "cardcom-checkout");
  if (!tab) return null;
  try {
    tab.document.write(
      `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>סליקה</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#334155">פותחים את דף הסליקה...</body></html>`
    );
    tab.document.close();
  } catch {
    // אם אי אפשר לכתוב לכרטיסייה — עדיין ננווט אליה בהמשך.
  }
  return tab;
}

function goToCheckout(url: string, tab: Window | null) {
  if (tab && !tab.closed) {
    tab.location.replace(url);
    return true;
  }
  window.location.assign(url);
  return false;
}

export function AssignToClassDialog({
  cls,
  mode,
  registered,
  onClose,
}: {
  cls: AdminClassRow;
  mode: AssignMode;
  registered: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const isWaitlist = mode.kind === "waitlist";

  const [customers, setCustomers] = useState<CustomerOption[] | null>(
    isWaitlist ? [] : null
  );
  const [tiers, setTiers] = useState<SiblingDiscountTier[]>([]);
  const [categorySiblingIds, setCategorySiblingIds] = useState<string[]>([]);
  const periodTotal = classPeriodTotal(Number(cls.price), cls.billing_months);
  const [unitPrice, setUnitPrice] = useState(periodTotal);
  const [prorationNote, setProrationNote] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [parentId, setParentId] = useState<string | null>(
    isWaitlist ? mode.entry.parent_id : null
  );
  const [childIds, setChildIds] = useState<string[]>(
    isWaitlist && mode.entry.child_id ? [mode.entry.child_id] : []
  );
  const [includeSelf, setIncludeSelf] = useState(
    isWaitlist && !mode.entry.child_id
  );
  const appointment = isAppointmentClass(cls);
  const [weeklySlotId, setWeeklySlotId] = useState(
    isWaitlist ? mode.entry.weekly_slot_id ?? "" : ""
  );
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<
    { id: string; session_date: string; start_time: string; end_time: string }[]
  >([]);
  const [slots, setSlots] = useState<
    {
      id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      gender_policy: "male" | "female" | "mixed";
    }[]
  >([]);
  const [method, setMethod] = useState<AssignChargeMethod>("cash");
  const [markPaid, setMarkPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptLabel, setReceiptLabel] = useState<ReceiptLabelChoice>(
    EMPTY_RECEIPT_LABEL_CHOICE
  );

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase.rpc("class_sibling_discount_tiers", { p_class_id: cls.id }),
      loadFamilyDiscountSettings(supabase),
    ]).then(([{ data }, settings]) => {
      if (active) {
        setTiers(
          siblingTiersForCheckout(
            cls.category,
            parseSiblingTiers(data),
            settings.classCategories
          )
        );
      }
    });

    supabase
      .from("class_sessions")
      .select("session_date, start_time, status")
      .eq("class_id", cls.id)
      .then(({ data }) => {
        if (!active) return;
        if (isAppointmentClass(cls)) {
          setUnitPrice(Number(cls.price) || 0);
          setProrationNote(null);
          return;
        }
        const proration = prorateClassPrice(
          classPeriodTotal(Number(cls.price), cls.billing_months),
          data ?? [],
          todayInIsrael()
        );
        setUnitPrice(proration.unitPrice);
        setProrationNote(
          proration.isLate
            ? `החוג כבר התחיל — מחיר מוצע ממפגש ${proration.firstSessionNumber} מתוך ${proration.billableCount} (${proration.remainingCount} מפגשים × ${formatCurrency(proration.pricePerSession)})`
            : proration.hasEnded
              ? "כל המפגשים כבר התקיימו. אפשר עדיין לשבץ בסכום ידני."
              : null
        );
      });

    if (isAppointmentClass(cls)) {
      supabase
        .from("class_sessions")
        .select("id, session_date, start_time, end_time")
        .eq("class_id", cls.id)
        .eq("status", "scheduled")
        .gte("session_date", todayInIsrael())
        .order("session_date")
        .order("start_time")
        .then(({ data }) => {
          if (active) setSessions(data ?? []);
        });
    } else if (cls.pick_one_slot) {
      supabase
        .from("class_weekly_slots")
        .select("id, day_of_week, start_time, end_time, gender_policy")
        .eq("class_id", cls.id)
        .order("day_of_week")
        .order("start_time")
        .then(({ data }) => {
          if (active) setSlots(data ?? []);
        });
    }

    if (!isWaitlist) {
      supabase
        .from("profiles")
        .select("id, full_name, phone, children(id, full_name, birth_date)")
        .eq("role", "parent")
        .order("full_name")
        .then(({ data }) => {
          if (active) setCustomers(data ?? []);
        });
    }

    return () => {
      active = false;
    };
  }, [cls.id, cls.category, cls.price, cls.billing_months, isWaitlist]);

  useEffect(() => {
    if (!parentId) {
      setCategorySiblingIds([]);
      return;
    }

    let active = true;
    listFamilyChildrenInCategory(
      createClient(),
      parentId,
      cls.id,
      cls.category
    ).then((ids) => {
      if (active) setCategorySiblingIds(ids);
    });

    return () => {
      active = false;
    };
  }, [parentId, cls.id, cls.category]);

  const activeEnrollments = cls.enrollments.filter(
    (enrollment) => enrollment.status !== "cancelled"
  );
  const enrolledChildIds = new Set(
    activeEnrollments
      .map((enrollment) => enrollment.child_id)
      .filter((id): id is string => Boolean(id))
  );
  const parentAlreadyEnrolled = Boolean(
    parentId &&
      activeEnrollments.some(
        (enrollment) =>
          enrollment.parent_id === parentId && enrollment.child_id == null
      )
  );
  const participantCount = participantCountOf(childIds, includeSelf);

  const selectedCustomer = customers?.find(
    (customer) => customer.id === parentId
  );

  const siblingsInCategory = parentId
    ? countFamilyChildrenInCategory(categorySiblingIds, childIds)
    : 0;

  const orderPreview = calculateOrderTotal(
    unitPrice,
    participantCount,
    tiers,
    siblingsInCategory + participantCount,
  );
  const discountPercent = orderPreview.percent;
  const listTotal = orderPreview.listTotal;
  const suggestedTotal = orderPreview.total;

  // הסכום מתעדכן לפי הבחירה, אלא אם המנהל כבר שינה אותו ידנית.
  useEffect(() => {
    if (amountTouched) return;
    setAmount(participantCount > 0 ? String(suggestedTotal) : "");
  }, [amountTouched, participantCount, suggestedTotal]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const q = normalize(search);
    if (!q) return customers;
    return customers.filter(
      (customer) =>
        normalize(customer.full_name).includes(q) ||
        normalize(customer.phone ?? "").includes(q) ||
        customer.children.some((child) => normalize(child.full_name).includes(q))
    );
  }, [customers, search]);

  const available =
    cls.capacity == null ? Number.POSITIVE_INFINITY : cls.capacity - registered;
  const overCapacity =
    cls.capacity != null && participantCount > 0 && participantCount > available;
  const isCreditCard = method === "credit_card";

  function handleMethodChange(next: AssignChargeMethod) {
    setMethod(next);
    if (next === "credit_card") setMarkPaid(false);
  }

  function toggleChild(id: string) {
    setChildIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId || participantCount === 0) {
      setError("נא לבחור לקוח ולפחות מתאמן או מתאמנת.");
      return;
    }
    if (appointment && !sessionId) {
      setError("נא לבחור תור לשיבוץ.");
      return;
    }
    if (!cls.interest_only && !appointment && cls.pick_one_slot && !weeklySlotId) {
      setError("נא לבחור מועד לשיבוץ.");
      return;
    }
    if (appointment && participantCount !== 1) {
      setError("לתור לטיפול משבצים מתאמן אחד.");
      return;
    }
    if (
      !cls.interest_only &&
      method !== "none" &&
      receiptLabel.enabled &&
      !receiptLabel.labelId
    ) {
      setError("נא לבחור מה לרשום על הקבלה, או לבטל את הבקשה לפרטים שונים.");
      return;
    }

    const checkoutTab =
      !cls.interest_only && isCreditCard ? openCheckoutTab() : null;

    setSaving(true);
    setError(null);

    const receiptLabelId =
      !cls.interest_only && method !== "none" && receiptLabel.enabled
        ? receiptLabel.labelId
        : null;

    const payload = cls.interest_only
      ? { amount: 0, method: "none" as const, markPaid: false }
      : {
          amount: Number(amount || 0),
          method,
          markPaid,
          receiptLabelId,
        };

    const result = isWaitlist
      ? await assignWaitlistEntry({ waitlistId: mode.entry.id, ...payload })
      : await assignChildrenToClass({
          classId: cls.id,
          parentId,
          childIds,
          includeSelf,
          weeklySlotId: weeklySlotId || null,
          sessionId: sessionId || null,
          ...payload,
        });

    setSaving(false);

    if (!result.success) {
      checkoutTab?.close();
      setError(result.error);
      return;
    }

    if (result.checkoutUrl) {
      const openedInTab = goToCheckout(result.checkoutUrl, checkoutTab);
      if (!openedInTab) return;
    } else {
      checkoutTab?.close();
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="שיבוץ לחוג"
      description={cls.title}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {cls.interest_only && (
          <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            זו הרשמת עניין — השיבוץ יישמר בלי חיוב.
          </p>
        )}

        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ink-500">תפוסה נוכחית</span>
            <span className="font-semibold text-ink-900">
              {cls.capacity == null
                ? `${registered} · ללא הגבלה`
                : `${registered} מתוך ${cls.capacity}`}
            </span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="text-ink-500">
              {cls.interest_only ? "תשלום" : "מחיר למשתתף/ת"}
            </span>
            <span className="font-semibold text-ink-900">
              {cls.interest_only ? "ללא תשלום" : formatCurrency(unitPrice)}
            </span>
          </div>
          {!cls.interest_only && unitPrice !== periodTotal && (
            <div className="mt-1 flex justify-between gap-3 text-ink-400">
              <span>מחיר מלא לתקופה</span>
              <span className="line-through">{formatCurrency(periodTotal)}</span>
            </div>
          )}
          {!cls.interest_only &&
            (parseBillingMonths(cls.billing_months) ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              {formatCurrency(cls.price)} לחודש ×{" "}
              {parseBillingMonths(cls.billing_months)} חודשים. בדף הסליקה אפשר
              לפרוס עד {classInstallmentsMax(cls.billing_months)} תשלומים.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              בדף הסליקה אפשר לפרוס עד {classInstallmentsMax(cls.billing_months)}{" "}
              תשלומים.
            </p>
          ))}
          {!cls.interest_only && prorationNote && (
            <p className="mt-2 text-xs leading-relaxed text-amber-800">
              {prorationNote}
            </p>
          )}
        </div>

        {appointment && (
          <Field label="תור" required>
            <Select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
            >
              <option value="">בחרו תאריך ושעה...</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDate(session.session_date)} · {formatTime(session.start_time)}–{formatTime(session.end_time)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!cls.interest_only && !appointment && cls.pick_one_slot && (
          <Field label="מועד" required>
            <Select
              value={weeklySlotId}
              onChange={(e) => setWeeklySlotId(e.target.value)}
              required
            >
              <option value="">בחרו מועד...</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatWeeklySlotLabel(
                    slot.day_of_week,
                    slot.start_time,
                    slot.end_time,
                    slot.gender_policy
                  )}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {isWaitlist ? (
          <div className="rounded-2xl border border-ink-100 p-4">
            <p className="text-xs text-ink-400">מרשימת ההמתנה</p>
            <p className="mt-0.5 font-semibold text-ink-900">
              {mode.entry.children?.full_name?.trim() ||
                mode.entry.profiles?.full_name ||
                "—"}
            </p>
            {mode.entry.children?.full_name?.trim() && (
              <p className="text-sm text-ink-500">
                הורה: {mode.entry.profiles?.full_name ?? "—"}
              </p>
            )}
          </div>
        ) : (
          <CustomerPicker
            customers={customers}
            filtered={filteredCustomers}
            search={search}
            onSearchChange={setSearch}
            selected={selectedCustomer ?? null}
            onSelect={(customer) => {
              const alreadySelf = activeEnrollments.some(
                (enrollment) =>
                  enrollment.parent_id === customer.id &&
                  enrollment.child_id == null
              );
              setParentId(customer.id);
              setChildIds([]);
              setIncludeSelf(customer.children.length === 0 && !alreadySelf);
              setAmountTouched(false);
            }}
            onClear={() => {
              setParentId(null);
              setChildIds([]);
              setIncludeSelf(false);
              setAmountTouched(false);
            }}
            childIds={childIds}
            onToggleChild={toggleChild}
            includeSelf={includeSelf}
            onToggleSelf={() => setIncludeSelf((current) => !current)}
            enrolledChildIds={enrolledChildIds}
            parentAlreadyEnrolled={parentAlreadyEnrolled}
          />
        )}

        {overCapacity && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {available > 0
              ? `נשארו ${available} מקומות פנויים — השיבוץ יחרוג מהתפוסה.`
              : "החוג מלא. השיבוץ יחרוג מהתפוסה שהוגדרה."}
          </p>
        )}

        {!cls.interest_only && discountPercent > 0 && participantCount > 0 && (
          <p className="rounded-xl bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
            הנחת בני משפחה של {discountPercent}% חלה על המשתתף השני ומעלה
            {orderPreview.fullPriceChildren > 0
              ? ` (${orderPreview.fullPriceChildren} במחיר מלא, ${orderPreview.discountedChildren} בהנחה)`
              : ` (כל ${orderPreview.discountedChildren} המשתתפים בהזמנה בהנחה)`}
            {siblingsInCategory > 0
              ? ` · למשפחה כבר ${siblingsInCategory} ילדים באותה קטגוריה`
              : ""}
            . מחיר מלא: {formatCurrency(listTotal)}.
          </p>
        )}

        {!cls.interest_only && (
          <>
        <Field
          label="אמצעי תשלום"
          htmlFor="assign-method"
          hint={
            method === "credit_card"
              ? "דף הסליקה של קארדקום ייפתח בכרטיסייה חדשה. אם הדפדפן חוסם אותה — תועברו אליו כאן."
              : method === "none"
                ? "הלקוח ישובץ לחוג בלי רשומת חיוב — אין חוב ואין הפרש לגבייה."
                : markPaid
                  ? "הלקוח ישובץ לחוג לפי הסכום שהוזן בלבד. אין חיוב נוסף על ההפרש ממחיר החוג."
                  : "ייפתח חוב בגבייה לפי הסכום שהוזן בלבד — לא על ההפרש ממחיר החוג."
          }
        >
          <Select
            id="assign-method"
            value={method}
            onChange={(e) =>
              handleMethodChange(e.target.value as AssignChargeMethod)
            }
          >
            <option value="credit_card">{PAYMENT_METHOD.credit_card}</option>
            {DEFERRED_PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD[value]}
              </option>
            ))}
            <option value="none">ללא חיוב</option>
          </Select>
        </Field>

        {method !== "none" && (
          <>
            {isCreditCard && (
              <CardcomRedirectHint
                installmentsMax={classInstallmentsMax(cls.billing_months)}
              />
            )}

            <Field
              label="סכום סופי ללקוח"
              htmlFor="assign-amount"
              hint={
                participantCount > 1
                  ? `הסכום הסופי יתחלק בין ${participantCount} המשתתפים. אין חיוב נוסף על ההפרש ממחיר החוג.`
                  : "זה הסכום הסופי. אם הורדתם ממחיר החוג — זו הנחה, בלי חוב על ההפרש."
              }
              required
            >
              <Input
                id="assign-amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(e.target.value);
                }}
                required
              />
            </Field>
            {Number(amount || 0) < listTotal && Number(amount || 0) >= 0 && listTotal > 0 && (
              <p className="rounded-xl bg-aqua-50 px-4 py-3 text-sm text-aqua-800">
                הנחת מנהל: יחויב {formatCurrency(Number(amount || 0))} במקום{" "}
                {formatCurrency(listTotal)}. הלקוח ישובץ לחוג הרגיל, בלי חוב על
                ההפרש ({formatCurrency(listTotal - Number(amount || 0))}).
              </p>
            )}

            {!isCreditCard && (
              <label className="flex items-center gap-2.5 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={markPaid}
                  onChange={(e) => setMarkPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
                />
                התשלום כבר התקבל — לסמן כשולם
              </label>
            )}

            <ReceiptLabelField
              productTitle={cls.title}
              value={receiptLabel}
              onChange={setReceiptLabel}
              disabled={saving}
            />
          </>
        )}
          </>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            ביטול
          </Button>
          <Button type="submit" disabled={saving || participantCount === 0}>
            {saving
              ? isCreditCard
                ? "מעבד תשלום..."
                : "משבץ..."
              : assignSubmitLabel(
                  participantCount,
                  includeSelf,
                  isCreditCard && Number(amount || 0) > 0
                )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerPicker({
  customers,
  filtered,
  search,
  onSearchChange,
  selected,
  onSelect,
  onClear,
  childIds,
  onToggleChild,
  includeSelf,
  onToggleSelf,
  enrolledChildIds,
  parentAlreadyEnrolled,
}: {
  customers: CustomerOption[] | null;
  filtered: CustomerOption[];
  search: string;
  onSearchChange: (value: string) => void;
  selected: CustomerOption | null;
  onSelect: (customer: CustomerOption) => void;
  onClear: () => void;
  childIds: string[];
  onToggleChild: (id: string) => void;
  includeSelf: boolean;
  onToggleSelf: () => void;
  enrolledChildIds: Set<string>;
  parentAlreadyEnrolled: boolean;
}) {
  if (customers === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!selected) {
    return (
      <Field label="בחירת לקוח" htmlFor="assign-customer" required>
        <Input
          id="assign-customer"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="חיפוש לפי שם הורה, טלפון או שם ילד/ה..."
        />
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-ink-100 p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-400">
              לא נמצאו לקוחות
            </li>
          ) : (
            filtered.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => onSelect(customer)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-ink-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {customer.full_name}
                    </span>
                    <span className="block truncate text-xs text-ink-400">
                      {customer.children.length > 0
                        ? customer.children
                            .map((child) => child.full_name)
                            .join(" · ")
                        : "ללא ילדים רשומים"}
                    </span>
                  </span>
                  {customer.phone && (
                    <span dir="ltr" className="shrink-0 text-xs text-ink-400">
                      {customer.phone}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </Field>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 p-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-400">לקוח</p>
          <p className="truncate font-semibold text-ink-900">
            {selected.full_name}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          החלפה
        </Button>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold text-ink-800">
          מי לשבץ לחוג
        </legend>
        <p className="mb-2 text-xs leading-relaxed text-ink-500">
          אפשר לשבץ את ההורה או כל ילד/ה — גם אם הגיל או המגדר לא תואמים לחוג.
        </p>
        <ul className="space-y-1.5">
          <li>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                includeSelf
                  ? "border-brand-300 bg-brand-50"
                  : "border-ink-100 hover:bg-ink-50",
                parentAlreadyEnrolled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={includeSelf}
                disabled={parentAlreadyEnrolled}
                onChange={onToggleSelf}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                {selected.full_name}
                <span className="mr-1.5 text-xs font-normal text-ink-400">
                  הורה
                </span>
              </span>
              {parentAlreadyEnrolled && <Badge tone="neutral">כבר רשום/ה</Badge>}
            </label>
          </li>
          {selected.children.map((child) => {
            const alreadyEnrolled = enrolledChildIds.has(child.id);
            const checked = childIds.includes(child.id);
            const age = calcAge(child.birth_date);

            return (
              <li key={child.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                    checked
                      ? "border-brand-300 bg-brand-50"
                      : "border-ink-100 hover:bg-ink-50",
                    alreadyEnrolled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={alreadyEnrolled}
                    onChange={() => onToggleChild(child.id)}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {child.full_name}
                    {age !== null && (
                      <span className="mr-1.5 text-xs font-normal text-ink-400">
                        גיל {age}
                      </span>
                    )}
                  </span>
                  {alreadyEnrolled && <Badge tone="neutral">כבר רשום/ה</Badge>}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
