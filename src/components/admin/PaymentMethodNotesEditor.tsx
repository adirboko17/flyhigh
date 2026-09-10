"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethodNoteCard } from "@/components/payments/PaymentMethodNoteCard";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { DEFERRED_PAYMENT_METHODS, PAYMENT_METHOD } from "@/lib/constants";
import { savePaymentMethodNote } from "@/lib/admin/paymentMethodNoteActions";
import {
  PAYMENT_METHOD_NOTE_ORDER,
  type PaymentMethodNotes,
} from "@/lib/payments/methodNotes";
import { cn } from "@/utils/cn";
import type { Enums } from "@/types/database.types";

const CHECKOUT_METHODS = new Set<string>([
  "credit_card",
  ...DEFERRED_PAYMENT_METHODS,
]);

const METHOD_META: Record<
  Enums<"payment_method">,
  { icon: IconName; accent: string }
> = {
  credit_card: { icon: "card", accent: "bg-brand-50 text-brand-700" },
  cash: { icon: "money", accent: "bg-aqua-50 text-aqua-700" },
  bank_transfer: { icon: "wallet", accent: "bg-sky-50 text-sky-700" },
  bit: { icon: "phone", accent: "bg-brand-50 text-brand-700" },
  paybox: { icon: "bag", accent: "bg-amber-50 text-amber-800" },
  standing_order: { icon: "calendar", accent: "bg-ink-50 text-ink-700" },
  maccabi: { icon: "badge", accent: "bg-sky-50 text-sky-700" },
  amit: { icon: "shield", accent: "bg-amber-50 text-amber-800" },
  pool_pass: { icon: "ticket", accent: "bg-aqua-50 text-aqua-700" },
  external: { icon: "settings", accent: "bg-ink-50 text-ink-600" },
};

export function PaymentMethodNotesEditor({
  notes,
}: {
  notes: PaymentMethodNotes;
}) {
  const filled = PAYMENT_METHOD_NOTE_ORDER.filter((method) =>
    notes[method]?.trim()
  ).length;
  const [openMethod, setOpenMethod] = useState<Enums<"payment_method"> | null>(
    null
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name="wallet" size={20} />
          </span>
          <div className="min-w-0">
            <CardTitle>הערות ללקוח</CardTitle>
            <p className="mt-0.5 text-sm text-ink-500">
              לחצו על אמצעי כדי לערוך. ההערה תופיע בבחירת התשלום ובעמוד הלקוח.
            </p>
          </div>
        </div>
        <Badge tone={filled > 0 ? "info" : "neutral"}>{filled} עם הערה</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-ink-100">
          {PAYMENT_METHOD_NOTE_ORDER.map((method) => (
            <MethodRow
              key={method}
              method={method}
              initialNote={notes[method] ?? ""}
              open={openMethod === method}
              onToggle={() =>
                setOpenMethod((current) =>
                  current === method ? null : method
                )
              }
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MethodRow({
  method,
  initialNote,
  open,
  onToggle,
}: {
  method: Enums<"payment_method">;
  initialNote: string;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = note.trim() !== initialNote.trim();
  const hasNote = initialNote.trim().length > 0;
  const inCheckout = CHECKOUT_METHODS.has(method);
  const meta = METHOD_META[method];

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await savePaymentMethodNote({ method, note });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors sm:px-5",
          open ? "bg-ink-50/80" : "hover:bg-ink-50/60"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            meta.accent
          )}
        >
          <Icon name={meta.icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold text-ink-900">
              {PAYMENT_METHOD[method]}
            </span>
            <Badge tone={hasNote ? "success" : "neutral"}>
              {hasNote ? "יש הערה" : "בלי הערה"}
            </Badge>
            <Badge tone={inCheckout ? "brand" : "neutral"}>
              {inCheckout ? "באתר" : "במשרד"}
            </Badge>
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            {hasNote
              ? initialNote.replace(/\s+/g, " ")
              : inCheckout
                ? "מוצג בבחירת תשלום באתר"
                : "מוצג בכרטיס הלקוח כשיש חיוב כזה"}
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
        <div className="space-y-3 border-t border-ink-100 bg-ink-50/40 px-4 py-4 sm:px-5">
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            rows={6}
            placeholder="כתבו כאן את מה שהלקוח צריך לראות — אפשר כמה שורות."
            className="bg-white"
          />
          {note.trim() ? (
            <PaymentMethodNoteCard
              method={method}
              note={note}
              title="כך הלקוח יראה את זה"
            />
          ) : (
            <p className="text-sm text-ink-400">
              בלי הערה — הלקוח יראה רק את שם האמצעי.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? "שומר..." : "שמירה"}
            </Button>
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setNote(initialNote);
                  setError(null);
                  setSaved(false);
                }}
                className="text-sm font-semibold text-ink-500 hover:text-ink-800"
              >
                ביטול שינויים
              </button>
            )}
            {saved && !dirty && (
              <p className="text-sm font-medium text-aqua-700">נשמר</p>
            )}
            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
