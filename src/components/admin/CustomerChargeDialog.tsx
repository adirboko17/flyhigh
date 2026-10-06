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
import { createCustomerCharge } from "@/lib/collections/actions";
import { receiptLabelNote, type ReceiptLabelOption } from "@/lib/receipt-labels";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";

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

export function CustomerChargeCard({
  customer,
}: {
  customer: {
    id: string;
    full_name: string;
    email: string | null;
    receipt_name: string | null;
  };
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<CollectionPaymentMethod>("credit_card");
  const [description, setDescription] = useState("");
  const [labelId, setLabelId] = useState("");
  const [customText, setCustomText] = useState("");
  const [labels, setLabels] = useState<ReceiptLabelOption[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"card" | "collection" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAmount("");
    setMethod("credit_card");
    setDescription("");
    setLabelId("");
    setCustomText("");
    setError(null);
    setDone(null);
    setSaving(false);
    setOpen(false);
  }, [customer.id]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLabelsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("receipt_labels")
        .select("id, label, note")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (cancelled) return;
      setLabels(data ?? []);
      setLabelsLoading(false);
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

  function reset() {
    setAmount("");
    setMethod("credit_card");
    setDescription("");
    setLabelId("");
    setCustomText("");
    setError(null);
    setDone(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || done) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("נא להזין סכום חיוב חיובי.");
      return;
    }
    if (!description.trim() && !labelId && !customText.trim()) {
      setError("נא להזין תיאור לחיוב, לבחור שם לקבלה, או לכתוב טקסט מותאם.");
      return;
    }

    const tab = isCard ? openCheckoutTab() : null;
    setSaving(true);
    setError(null);
    const result = await createCustomerCharge({
      parentId: customer.id,
      amount: value,
      method,
      receiptLabelId: labelId || null,
      description,
      customText,
    });
    setSaving(false);

    if (!result.success || (isCard && !result.checkoutUrl)) {
      try {
        tab?.close();
      } catch {
        // הכרטיסייה אולי כבר נסגרה.
      }
      setError(
        result.success ? "לא הצלחנו לפתוח את דף הסליקה." : result.error
      );
      return;
    }

    if (result.checkoutUrl) {
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
            אשראי בטלפון, או פתיחת גבייה באמצעי אחר
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
            <p className="text-sm leading-relaxed text-ink-700">
              {done === "card"
                ? "דף הסליקה של קארדקום נפתח. אפשר להזין שם את כרטיס האשראי של הלקוח. אם התשלום לא יושלם, החיוב נשאר פתוח בעמוד הגבייה."
                : "החיוב נפתח בעמוד הגבייה. שם רושמים את התקבול או מאשרים את התשלום."}
            </p>
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
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <p className="text-xs text-ink-500">
              לסגירה בטלפון: אשראי ממשיך לסליקה, ושאר האמצעים נפתחים בגבייה.
            </p>
            <Field label="סכום לחיוב (₪)" htmlFor={fieldId("amount")} required>
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
                  ? "דף הסליקה ייפתח עכשיו, כדי להזין את כרטיס הלקוח בטלפון."
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

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving
                  ? isCard
                    ? "פותח סליקה..."
                    : "פותח גבייה..."
                  : isCard
                    ? "המשך לתשלום באשראי"
                    : "פתיחת גבייה"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      )}
    </Card>
  );
}
