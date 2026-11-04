"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { issueCollectionInvoices } from "@/lib/collections/actions";
import { allocateInvoices } from "@/lib/collections/invoiceSplit";
import {
  PAYMENT_METHOD,
  isManualReceiptMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

const METHODS = ["cash", "bank_transfer", "paybox"] as const;

type SplitMethod = (typeof METHODS)[number];

export type InvoiceSplitCharge = {
  id: string;
  remaining: number;
  method: CollectionPaymentMethod;
  childName: string | null;
  subject: string;
};

type Draft = { amount: string; name: string };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function todayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function chargeLabel(charge: InvoiceSplitCharge) {
  return charge.childName ? `${charge.subject} · ${charge.childName}` : charge.subject;
}

function defaultMethod(charges: InvoiceSplitCharge[]): SplitMethod {
  const manual = charges.find((charge) => isManualReceiptMethod(charge.method));
  return manual && isManualReceiptMethod(manual.method) ? manual.method : "bank_transfer";
}

export function InvoiceSplitDialog({
  open,
  parentName,
  charges,
  onClose,
  onIssued,
}: {
  open: boolean;
  parentName: string;
  charges: InvoiceSplitCharge[];
  onClose: () => void;
  onIssued?: () => void;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<SplitMethod>("bank_transfer");
  const [receivedDate, setReceivedDate] = useState(todayDateInput);
  const [drafts, setDrafts] = useState<Draft[]>([{ amount: "", name: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = round2(charges.reduce((sum, charge) => sum + charge.remaining, 0));
  const parsed = drafts.map((draft) => round2(Number(draft.amount) || 0));
  const sum = round2(parsed.reduce((acc, amount) => acc + amount, 0));
  const gap = round2(total - sum);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMethod(defaultMethod(charges));
      setReceivedDate(todayDateInput());
      setDrafts([{ amount: total > 0 ? String(total) : "", name: "" }]);
      setError(null);
    }
    wasOpen.current = open;
  }, [open, charges, total]);

  const allocated =
    charges.length === 0 || parsed.some((amount) => amount <= 0)
      ? null
      : allocateInvoices(
          charges.map((charge) => ({ id: charge.id, remaining: charge.remaining })),
          parsed
        );
  const preview = allocated?.ok ? allocated.slices : null;

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft))
    );
  }

  function fillLast() {
    if (gap <= 0) return;
    setDrafts((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (!last) return current;
      const currentAmount = round2(Number(last.amount) || 0);
      next[next.length - 1] = {
        ...last,
        amount: String(round2(currentAmount + gap)),
      };
      return next;
    });
  }

  async function handleSave() {
    if (charges.length === 0) {
      setError("סמנו לפחות חיוב אחד.");
      return;
    }
    if (drafts.some((draft) => !draft.name.trim())) {
      setError("לכל חשבונית צריך את השם שיופיע עליה.");
      return;
    }
    if (parsed.some((amount) => amount <= 0)) {
      setError("כל חשבונית חייבת להיות בסכום חיובי.");
      return;
    }
    if (gap < -0.05) {
      setError(`סכום החשבוניות גדול מהיתרה (${formatCurrency(total)}).`);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await issueCollectionInvoices({
      paymentIds: charges.map((charge) => charge.id),
      method,
      receivedAt: `${receivedDate}T12:00:00`,
      invoices: drafts.map((draft, index) => ({
        amount: parsed[index] ?? 0,
        name: draft.name.trim(),
      })),
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      router.refresh();
      return;
    }

    (onIssued ?? onClose)();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={charges.length > 1 ? "איחוד ופיצול לחשבוניות" : "פיצול לחשבוניות"}
      description={parentName}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-600">
          {charges.length > 1
            ? "החיובים שסומנו מאוחדים לסכום אחד. אפשר להשאיר חשבונית אחת על הכול, או להוסיף חשבוניות ולחלק את הסכום."
            : "אפשר להשאיר חשבונית אחת על כל היתרה, או להוסיף חשבוניות ולחלק את הסכום."}
          {" "}לכל חשבונית רושמים סכום ואת השם שיופיע עליה.
        </p>

        <ul className="space-y-1 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
          {charges.map((charge) => (
            <li key={charge.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{chargeLabel(charge)}</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(charge.remaining)}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="אמצעי תשלום" required>
            <Select
              value={method}
              disabled={loading}
              onChange={(event) => setMethod(event.target.value as SplitMethod)}
            >
              {METHODS.map((item) => (
                <option key={item} value={item}>
                  {PAYMENT_METHOD[item]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="תאריך" required>
            <Input
              type="date"
              dir="ltr"
              value={receivedDate}
              disabled={loading}
              onChange={(event) => setReceivedDate(event.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-800">חשבוניות</p>
            <p className="text-xs text-ink-500">
              נבחר {formatCurrency(total)}
              <span className="mx-1 text-ink-300">·</span>
              בחשבוניות {formatCurrency(sum)}
            </p>
          </div>
          <ul className="space-y-2">
            {drafts.map((draft, index) => (
              <li
                key={index}
                className="grid grid-cols-1 gap-2 rounded-xl border border-ink-100 p-3 sm:grid-cols-[7.5rem_1fr_auto]"
              >
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  inputMode="decimal"
                  dir="ltr"
                  aria-label={`סכום חשבונית ${index + 1}`}
                  placeholder="סכום"
                  value={draft.amount}
                  disabled={loading}
                  onChange={(event) => updateDraft(index, { amount: event.target.value })}
                />
                <Input
                  aria-label={`שם על חשבונית ${index + 1}`}
                  placeholder="השם שיופיע על החשבונית"
                  value={draft.name}
                  disabled={loading}
                  onChange={(event) => updateDraft(index, { name: event.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading || drafts.length < 2}
                  onClick={() =>
                    setDrafts((current) => current.filter((_, i) => i !== index))
                  }
                >
                  הסרה
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading || drafts.length >= 8}
              onClick={() => setDrafts((current) => [...current, { amount: "", name: "" }])}
            >
              חשבונית נוספת
            </Button>
            {gap > 0.05 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={fillLast}
              >
                מילוי היתרה ({formatCurrency(gap)})
              </Button>
            )}
          </div>
        </div>

        {preview && (
          <ul className="space-y-1 rounded-xl bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
            {drafts.map((draft, index) => {
              const slices = preview.filter((slice) => slice.invoiceIndex === index);
              const covers = slices
                .map((slice) => {
                  const charge = charges.find((item) => item.id === slice.paymentId);
                  return charge
                    ? `${formatCurrency(slice.amount)} על ${chargeLabel(charge)}`
                    : formatCurrency(slice.amount);
                })
                .join(" · ");
              return (
                <li key={index}>
                  חשבונית {index + 1}
                  {draft.name.trim() ? ` (${draft.name.trim()})` : ""}: {covers}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            חזרה
          </Button>
          <Button type="button" disabled={loading} onClick={() => void handleSave()}>
            {loading ? "מפיק..." : drafts.length === 1 ? "הפקת חשבונית" : "הפקת החשבוניות"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
