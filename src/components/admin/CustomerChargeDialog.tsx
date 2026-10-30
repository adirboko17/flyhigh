"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import {
  COLLECTION_PAYMENT_METHODS,
  PAYMENT_METHOD,
  isReceiptlessCollectionMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import {
  PURCHASE_GROUP_LABEL,
  PURCHASE_GROUP_ORDER,
  purchaseChargeAmount,
  purchaseOptionLabel,
  type PurchaseProductOption,
} from "@/lib/admin/customerPurchaseCatalog";
import {
  listProductsForCustomerPurchase,
  purchaseProductForCustomer,
} from "@/lib/admin/customerPurchase";
import { createCustomerCharge } from "@/lib/collections/actions";
import {
  createClassOfficeCharge,
  listClassesForPaymentLink,
  listClassScheduleOptions,
  type ClassScheduleChoice,
  type PaymentLinkClass,
} from "@/lib/admin/paymentLinks";
import { PaymentLinkResult } from "@/components/admin/PaymentLinkResult";
import { receiptLabelNote, type ReceiptLabelOption } from "@/lib/receipt-labels";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

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
    return;
  }
  window.location.assign(url);
}

function amountInputValue(price: number) {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

export function CustomerChargeCard({
  customer,
  onPurchased,
}: {
  customer: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    receipt_name: string | null;
    children: { id: string; full_name: string }[];
  };
  onPurchased?: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CollectionPaymentMethod>("credit_card");
  const [description, setDescription] = useState("");
  const [labelId, setLabelId] = useState("");
  const [customText, setCustomText] = useState("");
  const [labels, setLabels] = useState<ReceiptLabelOption[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [products, setProducts] = useState<PurchaseProductOption[]>([]);
  const [classes, setClasses] = useState<PaymentLinkClass[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [slots, setSlots] = useState<ClassScheduleChoice[]>([]);
  const [sessions, setSessions] = useState<ClassScheduleChoice[]>([]);
  const [slotId, setSlotId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [productKey, setProductKey] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [peopleCount, setPeopleCount] = useState("1");
  const [suggestedAmount, setSuggestedAmount] = useState("");
  const [autoDescription, setAutoDescription] = useState("");
  const [purchasedTitle, setPurchasedTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingMode, setPendingMode] = useState<"checkout" | "link" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"card" | "collection" | "link" | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [linkAmount, setLinkAmount] = useState(0);
  const [linkSubject, setLinkSubject] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAmount("");
    setMethod("credit_card");
    setDescription("");
    setLabelId("");
    setCustomText("");
    setProductKey("");
    setSlotId("");
    setSessionId("");
    setSlots([]);
    setSessions([]);
    setParticipantId("");
    setPeopleCount("1");
    setSuggestedAmount("");
    setAutoDescription("");
    setPurchasedTitle(null);
    setLinkUrl(null);
    setLinkSubject(null);
    setError(null);
    setDone(null);
    setSaving(false);
    setPendingMode(null);
    setOpen(false);
  }, [customer.id]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLabelsLoading(true);
      setProductsLoading(true);
      const supabase = createClient();
      const [{ data }, productRows, classRows] = await Promise.all([
        supabase
          .from("receipt_labels")
          .select("id, label, note")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true }),
        listProductsForCustomerPurchase().catch(() => []),
        listClassesForPaymentLink().catch(() => []),
      ]);
      if (cancelled) return;
      setLabels(data ?? []);
      setProducts(productRows);
      setClasses(classRows);
      setLabelsLoading(false);
      setProductsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [customer.id, open]);

  const isCard = method === "credit_card";
  const receiptless = isReceiptlessCollectionMethod(method);
  const invoiceName = customer.receipt_name?.trim() || customer.full_name;
  const fieldId = (name: string) => `customer-charge-${customer.id}-${name}`;
  const selectedProduct =
    products.find((option) => option.key === productKey) ?? null;
  const selectedClass =
    classes.find((item) => `class:${item.id}` === productKey) ?? null;

  useEffect(() => {
    if (!selectedClass || (!selectedClass.pickOneSlot && !selectedClass.appointment)) {
      setSlots([]);
      setSessions([]);
      setScheduleLoading(false);
      return;
    }
    let cancelled = false;
    setScheduleLoading(true);
    void listClassScheduleOptions(selectedClass.id)
      .then((schedule) => {
        if (cancelled) return;
        setSlots(schedule.slots);
        setSessions(schedule.sessions);
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  function applyProduct(option: PurchaseProductOption | null, people = 1) {
    if (!option) {
      setSuggestedAmount("");
      return;
    }
    const price = purchaseChargeAmount(option, people);
    if (price == null) return;
    const nextAmount = amountInputValue(price);
    setAmount((current) =>
      !current || current === suggestedAmount ? nextAmount : current
    );
    setSuggestedAmount(nextAmount);
    setDescription((current) => {
      if (current.trim() && current !== autoDescription) return current;
      return option.title;
    });
    setAutoDescription(option.title);
  }

  function applySuggested(title: string, price: number) {
    const nextAmount = amountInputValue(price);
    setAmount((current) =>
      !current || current === suggestedAmount ? nextAmount : current
    );
    setSuggestedAmount(nextAmount);
    setDescription((current) => {
      if (current.trim() && current !== autoDescription) return current;
      return title;
    });
    setAutoDescription(title);
  }

  function chooseProduct(key: string) {
    setProductKey(key);
    setSlotId("");
    setSessionId("");
    setError(null);
    const cls = classes.find((item) => `class:${item.id}` === key);
    if (cls) {
      applySuggested(cls.title, cls.price);
      return;
    }
    const option = products.find((item) => item.key === key) ?? null;
    if (!option) {
      setAmount((current) => (current === suggestedAmount ? "" : current));
      setDescription((current) =>
        current === autoDescription ? "" : current
      );
      setSuggestedAmount("");
      setAutoDescription("");
      return;
    }
    const people = option.pricing === "people" ? option.defaultPeople : 1;
    setPeopleCount(String(people));
    applyProduct(option, people);
  }

  function reset() {
    setAmount("");
    setMethod("credit_card");
    setDescription("");
    setLabelId("");
    setCustomText("");
    setProductKey("");
    setSlotId("");
    setSessionId("");
    setParticipantId("");
    setPeopleCount("1");
    setSuggestedAmount("");
    setAutoDescription("");
    setPurchasedTitle(null);
    setLinkUrl(null);
    setLinkSubject(null);
    setError(null);
    setDone(null);
  }

  async function submit(mode: "checkout" | "link") {
    if (saving || done) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("נא להזין סכום חיוב חיובי.");
      return;
    }
    if (
      !selectedProduct &&
      !selectedClass &&
      !description.trim() &&
      !labelId &&
      !customText.trim()
    ) {
      setError("נא לבחור שירות, להזין תיאור, או לבחור שם לקבלה.");
      return;
    }
    if (mode === "link" && !isCard) {
      setError("לינק לתשלום נפתח רק כשאמצעי התשלום הוא אשראי.");
      return;
    }
    if (selectedProduct?.pricing === "people") {
      const people = Math.floor(Number(peopleCount));
      if (purchaseChargeAmount(selectedProduct, people) == null) {
        setError("נא לבחור מספר משתתפים שמופיע במחירון.");
        return;
      }
    }
    if (selectedClass?.pickOneSlot && !slotId) {
      setError("נא לבחור מועד לחוג.");
      return;
    }
    if (selectedClass?.appointment && !sessionId) {
      setError("נא לבחור תור.");
      return;
    }

    const tab = isCard && mode === "checkout" ? openCheckoutTab() : null;
    setSaving(true);
    setPendingMode(mode);
    setError(null);
    const result = selectedClass
      ? await createClassOfficeCharge({
          parentId: customer.id,
          classId: selectedClass.id,
          childId: participantId || null,
          amount: value,
          method,
          weeklySlotId: slotId || null,
          sessionId: sessionId || null,
        })
      : selectedProduct
        ? await purchaseProductForCustomer({
            parentId: customer.id,
            kind: selectedProduct.kind,
            planId: selectedProduct.planId,
            childId: participantId || null,
            packageQuantity: selectedProduct.packageQuantity,
            peopleCount:
              selectedProduct.pricing === "people"
                ? Math.floor(Number(peopleCount))
                : null,
            amount: value,
            method,
            receiptLabelId: labelId || null,
            description,
            customText,
          })
        : await createCustomerCharge({
            parentId: customer.id,
            amount: value,
            method,
            receiptLabelId: labelId || null,
            description,
            customText,
          });
    setSaving(false);
    setPendingMode(null);

    if (!result.success || (isCard && !result.checkoutUrl)) {
      try {
        tab?.close();
      } catch {
        // הכרטיסייה אולי כבר נסגרה.
      }
      setError(
        result.success ? "לא הצלחנו ליצור את דף התשלום." : result.error
      );
      return;
    }

    const title = selectedClass?.title ?? selectedProduct?.title ?? null;
    if (title) {
      setPurchasedTitle(title);
      onPurchased?.();
    } else {
      setPurchasedTitle(null);
    }
    if (mode === "link" && result.checkoutUrl) {
      try {
        tab?.close();
      } catch {
        // אין כרטיסייה במצב לינק.
      }
      setLinkUrl(result.checkoutUrl);
      setLinkAmount(value);
      setLinkSubject(title || description.trim() || "חיוב");
      setDone("link");
    } else if (result.checkoutUrl) {
      goToCheckout(result.checkoutUrl, tab);
      setDone("card");
    } else {
      setDone("collection");
    }
    router.refresh();
  }

  const panelId = `customer-charge-${customer.id}`;

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-right hover:bg-ink-50/80"
      >
        <Icon name="wallet" size={18} className="shrink-0 text-ink-500" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold text-ink-900">
            חיוב לקוח
          </span>
          <span className="mt-0.5 block text-xs text-ink-500">
            לינק תשלום לחוג, כרטיסייה, מנוי או כל שירות באתר
          </span>
        </span>
        <Icon
          name="chevron"
          size={18}
          className={cn(
            "shrink-0 text-ink-400 transition-transform",
            open ? "-rotate-90" : "rotate-90"
          )}
        />
      </button>
      {open && (
      <CardContent id={panelId} className="space-y-4 border-t border-ink-100 pt-4">
        {done ? (
          <div className="space-y-4">
            {done === "link" && linkUrl ? (
              <PaymentLinkResult
                url={linkUrl}
                amount={linkAmount}
                phone={customer.phone}
                subject={linkSubject}
              />
            ) : (
              <p className="text-sm leading-relaxed text-ink-700">
                {purchasedTitle
                  ? done === "card"
                    ? `«${purchasedTitle}» נרשם על הלקוח. דף הסליקה נפתח — אפשר להזין שם את כרטיס האשראי. אם התשלום לא יושלם, ההרשמה נשארת אצלו כחיוב פתוח.`
                    : `«${purchasedTitle}» נרשם על הלקוח, והחיוב נפתח בעמוד הגבייה.`
                  : done === "card"
                    ? "דף הסליקה של קארדקום נפתח. אפשר להזין שם את כרטיס האשראי של הלקוח. אם התשלום לא יושלם, החיוב נשאר פתוח בעמוד הגבייה."
                    : "החיוב נפתח בעמוד הגבייה. שם רושמים את התקבול או מאשרים את התשלום."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/collections" size="sm">
                לעמוד הגבייה
              </ButtonLink>
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                חיוב נוסף
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(isCard ? "link" : "checkout");
            }}
            className="space-y-4"
          >
            <p className="text-xs text-ink-500">
              בחרו חוג, כרטיסייה, מנוי או כל שירות באתר, והסכום מתמלא מהמחיר.
              באשראי אפשר להוציא לינק ולשלוח ללקוח.
            </p>

            <Field
              label="מה קונים"
              htmlFor={fieldId("product")}
              hint={
                selectedProduct || selectedClass
                  ? "הרכישה נרשמת על הלקוח. הסכום מתמלא מהמחיר, ואפשר לשנות אותו."
                  : "בלי שירות זה חיוב כללי, בלי הרשמה."
              }
            >
              <Select
                id={fieldId("product")}
                value={productKey}
                disabled={saving || productsLoading}
                onChange={(e) => chooseProduct(e.target.value)}
              >
                <option value="">
                  {productsLoading ? "טוען מוצרים..." : "חיוב כללי"}
                </option>
                {classes.length > 0 && (
                  <optgroup label="חוגים">
                    {classes.map((item) => (
                      <option key={item.id} value={`class:${item.id}`}>
                        {item.title} · {formatCurrency(item.price)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {PURCHASE_GROUP_ORDER.map((group) => {
                  const groupOptions = products.filter(
                    (option) => option.group === group
                  );
                  if (groupOptions.length === 0) return null;
                  return (
                    <optgroup key={group} label={PURCHASE_GROUP_LABEL[group]}>
                      {groupOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {purchaseOptionLabel(option)}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </Select>
            </Field>

            {(selectedProduct || selectedClass) && (
              <Field label="למי הרכישה" htmlFor={fieldId("participant")}>
                <Select
                  id={fieldId("participant")}
                  value={participantId}
                  disabled={saving}
                  onChange={(e) => setParticipantId(e.target.value)}
                >
                  <option value="">{customer.full_name} (הלקוח)</option>
                  {customer.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.full_name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {selectedClass?.pickOneSlot && (
              <Field label="מועד" htmlFor={fieldId("slot")} required>
                <Select
                  id={fieldId("slot")}
                  value={slotId}
                  disabled={saving || scheduleLoading}
                  required
                  onChange={(event) => {
                    const next = event.target.value;
                    setSlotId(next);
                    const slot = slots.find((item) => item.id === next);
                    if (slot?.price != null && selectedClass) {
                      applySuggested(selectedClass.title, slot.price);
                    }
                  }}
                >
                  <option value="">
                    {scheduleLoading ? "טוען מועדים..." : "בחירת מועד"}
                  </option>
                  {slots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                      {slot.price != null ? ` · ${formatCurrency(slot.price)}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {selectedClass?.appointment && (
              <Field label="תור" htmlFor={fieldId("session")} required>
                <Select
                  id={fieldId("session")}
                  value={sessionId}
                  disabled={saving || scheduleLoading}
                  required
                  onChange={(event) => setSessionId(event.target.value)}
                >
                  <option value="">
                    {scheduleLoading ? "טוען תורים..." : "בחירת תור"}
                  </option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {selectedProduct?.pricing === "people" && (
              <Field
                label="מספר משתתפים"
                htmlFor={fieldId("people")}
                hint="הסכום מתעדכן לפי המחירון. אפשר עדיין לשנות אותו ידנית."
                required
              >
                <Input
                  id={fieldId("people")}
                  type="number"
                  min={1}
                  max={selectedProduct.maxPeople}
                  step={1}
                  value={peopleCount}
                  disabled={saving}
                  required
                  onChange={(e) => {
                    const next = e.target.value;
                    setPeopleCount(next);
                    applyProduct(selectedProduct, Math.floor(Number(next)));
                  }}
                />
              </Field>
            )}

            <Field
              label="סכום לחיוב (₪)"
              htmlFor={fieldId("amount")}
              hint={
                (selectedProduct || selectedClass) && suggestedAmount
                  ? `מחיר המוצר: ${suggestedAmount} ₪`
                  : undefined
              }
              required
            >
              <Input
                id={fieldId("amount")}
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={saving}
                required
              />
            </Field>

            <Field
              label="אמצעי תשלום"
              htmlFor={fieldId("method")}
              hint={
                isCard
                  ? "יצירת לינק שולחת את הלקוח לדף התשלום. אפשר גם לפתוח את הסליקה כאן."
                  : selectedProduct || selectedClass
                    ? "הרכישה נרשמת על הלקוח עכשיו. התשלום מושלם בעמוד הגבייה."
                    : "החיוב ייפתח בעמוד הגבייה, ושם משלימים את הרישום."
              }
              required
            >
              <Select
                id={fieldId("method")}
                value={method}
                disabled={saving}
                onChange={(e) =>
                  setMethod(e.target.value as CollectionPaymentMethod)
                }
              >
                {COLLECTION_PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>
                    {PAYMENT_METHOD[option]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="תיאור החיוב"
              htmlFor={fieldId("description")}
              hint={
                labelId
                  ? "שם מהרשימה יופיע על הקבלה במקום התיאור."
                  : "יופיע בגבייה ועל הקבלה, אם לא נבחר שם אחר."
              }
            >
              <Input
                id={fieldId("description")}
                value={description}
                maxLength={120}
                disabled={saving}
                placeholder="לדוגמה: שיעור פרטי בטלפון"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field
              label="שם על הקבלה"
              htmlFor={fieldId("label")}
              hint="טקסט מהרשימה מחליף את התיאור על החשבונית."
            >
              <Select
                id={fieldId("label")}
                value={labelId}
                disabled={saving || labelsLoading}
                onChange={(e) => setLabelId(e.target.value)}
              >
                <option value="">
                  {description.trim() ? "לפי התיאור" : "בלי שם מהרשימה"}
                </option>
                {labels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {receiptLabelNote(option.note)
                      ? `${option.label} · ${receiptLabelNote(option.note)}`
                      : option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="טקסט מותאם אישית"
              htmlFor={fieldId("custom")}
              hint="מחליף את שם הקבלה לחיוב הזה בלבד. לא נשמר ברשימת התוויות."
            >
              <Input
                id={fieldId("custom")}
                value={customText}
                maxLength={120}
                disabled={saving}
                placeholder="לדוגמה: על שם חברה / שם שלא בתוויות"
                onChange={(e) => setCustomText(e.target.value)}
              />
            </Field>

            {!receiptless && (
              <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
                <p className="text-xs text-ink-500">הקבלה תופק על שם</p>
                <p className="mt-0.5 font-semibold text-ink-900">{invoiceName}</p>
                <p className="mt-2 text-xs text-ink-500">תישלח לאימייל</p>
                {customer.email ? (
                  <p
                    dir="ltr"
                    className="mt-0.5 text-right font-semibold text-ink-900"
                  >
                    {customer.email}
                  </p>
                ) : (
                  <p className="mt-0.5 font-medium text-amber-700">
                    אין אימייל בחשבון — המסמך יופק בלי שליחה
                  </p>
                )}
              </div>
            )}

            {receiptless && (
              <p className="text-sm leading-relaxed text-ink-600">
                {PAYMENT_METHOD[method]} לא מפיק חשבונית. החיוב ייפתח בגבייה, ושם
                מאשרים שהוא שולם.
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {isCard ? (
                <>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving && pendingMode === "link"
                      ? "יוצר לינק..."
                      : "יצירת לינק לתשלום"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void submit("checkout")}
                  >
                    {saving && pendingMode === "checkout"
                      ? "פותח סליקה..."
                      : "פתיחת הסליקה אצלי"}
                  </Button>
                </>
              ) : (
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "פותח גבייה..." : "פתיחת גבייה"}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
      )}
    </Card>
  );
}
