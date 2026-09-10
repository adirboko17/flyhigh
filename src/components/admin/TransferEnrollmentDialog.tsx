"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  loadTransferPreview,
  transferEnrollment,
  type TransferPreview,
} from "@/lib/admin/transferEnrollment";
import { classSlotPeriodPrice } from "@/lib/finance/classPricing";
import { formatCurrency } from "@/utils/format";

export function TransferEnrollmentButton({
  enrollmentId,
  currentClassId,
  compact = false,
  onTransferred,
}: {
  enrollmentId: string;
  currentClassId: string;
  compact?: boolean;
  onTransferred?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [toClassId, setToClassId] = useState("");
  const [weeklySlotId, setWeeklySlotId] = useState("");
  const [pricing, setPricing] = useState<"same" | "extra">("same");
  const [extraAmount, setExtraAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPreview(true);
    setPreview(null);
    setToClassId("");
    setWeeklySlotId("");
    setPricing("same");
    setExtraAmount("");
    setError(null);
    loadTransferPreview(enrollmentId).then((data) => {
      if (cancelled) return;
      setPreview(data);
      setLoadingPreview(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, enrollmentId]);

  const target = preview?.classes.find((cls) => cls.id === toClassId) ?? null;
  const targetPrice = useMemo(() => {
    if (!target) return 0;
    const slotPrice = target.pickOneSlot
      ? (target.slots.find((slot) => slot.id === weeklySlotId)?.price ?? null)
      : null;
    return classSlotPeriodPrice(target.price, target.billingMonths, slotPrice);
  }, [target, weeklySlotId]);

  const suggestedExtra = useMemo(() => {
    if (!preview || !target) return 0;
    return Math.max(0, Math.round((targetPrice - preview.alreadyPaid) * 100) / 100);
  }, [preview, target, targetPrice]);

  useEffect(() => {
    if (pricing === "extra" && suggestedExtra > 0 && !extraAmount) {
      setExtraAmount(String(suggestedExtra));
    }
  }, [pricing, suggestedExtra, extraAmount]);

  const overCapacity =
    target != null &&
    target.capacity != null &&
    target.taken >= target.capacity;

  async function handleSave() {
    if (!toClassId) {
      setError("נא לבחור חוג להחלפה.");
      return;
    }
    if (target?.pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד בחוג החדש.");
      return;
    }
    const extra = pricing === "extra" ? Number(extraAmount) : 0;
    if (pricing === "extra" && (!Number.isFinite(extra) || extra <= 0)) {
      setError("נא להזין סכום תוספת חיובי.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await transferEnrollment({
      enrollmentId,
      toClassId,
      weeklySlotId: weeklySlotId || null,
      extraAmount: pricing === "extra" ? extra : 0,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    onTransferred?.();
    router.refresh();
  }

  const options = (preview?.classes ?? []).filter(
    (cls) => cls.id !== currentClassId
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={compact ? "h-7 px-2.5 text-xs" : undefined}
        onClick={() => setOpen(true)}
      >
        החלפה
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title="החלפה לחוג אחר"
        description={
          preview
            ? `${preview.participantName} · ${preview.fromClassTitle}`
            : undefined
        }
      >
        <div className="space-y-4">
          {loadingPreview ? (
            <p className="text-sm text-ink-400">טוען חוגים...</p>
          ) : !preview ? (
            <p className="text-sm text-red-600">לא ניתן לטעון את פרטי ההחלפה.</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-600">
                המתאמן יעבור לחוג החדש. התשלום שכבר שולם נשאר בתיעוד.
                {preview.alreadyPaid > 0
                  ? ` שולם עד כה ${formatCurrency(preview.alreadyPaid)}.`
                  : ""}
              </p>

              <Field label="חוג חדש">
                <Select
                  value={toClassId}
                  onChange={(event) => {
                    setToClassId(event.target.value);
                    setWeeklySlotId("");
                    setError(null);
                  }}
                >
                  <option value="">בחרו חוג</option>
                  {options.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title}
                      {cls.capacity != null
                        ? ` · ${cls.taken}/${cls.capacity}`
                        : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              {target?.pickOneSlot && (
                <Field label="מועד">
                  <Select
                    value={weeklySlotId}
                    onChange={(event) => setWeeklySlotId(event.target.value)}
                  >
                    <option value="">בחרו מועד</option>
                    {target.slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                        {slot.price != null
                          ? ` · ${formatCurrency(slot.price)}`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {target && (
                <p className="text-xs text-ink-500">
                  מחיר החוג החדש: {formatCurrency(targetPrice)}
                  {overCapacity ? " · החוג מלא — ההחלפה תחרוג מהתפוסה." : ""}
                </p>
              )}

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink-800">
                  תשלום
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 px-4 py-3">
                  <input
                    type="radio"
                    name="transfer-pricing"
                    checked={pricing === "same"}
                    onChange={() => setPricing("same")}
                    className="mt-1 h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink-900">
                      אותו המחיר
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      בלי חיוב חדש — ההחלפה בלבד
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 px-4 py-3">
                  <input
                    type="radio"
                    name="transfer-pricing"
                    checked={pricing === "extra"}
                    onChange={() => setPricing("extra")}
                    className="mt-1 h-4 w-4 border-ink-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-900">
                      תוספת תשלום
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      ייפתח חיוב חדש בגבייה על שם {preview.parentName}
                    </span>
                  </span>
                </label>
              </fieldset>

              {pricing === "extra" && (
                <Field label="סכום התוספת">
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={extraAmount}
                    onChange={(event) => setExtraAmount(event.target.value)}
                    placeholder={
                      suggestedExtra > 0 ? String(suggestedExtra) : "0"
                    }
                  />
                </Field>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              חזרה
            </Button>
            <Button
              type="button"
              disabled={loading || loadingPreview || !preview}
              onClick={() => void handleSave()}
            >
              {loading ? "מחליף..." : "החלפה"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
