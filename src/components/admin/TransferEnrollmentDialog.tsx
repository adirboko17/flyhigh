"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingPreview(true);
    setPreview(null);
    setToClassId(currentClassId);
    setWeeklySlotId("");
    setError(null);
    loadTransferPreview(enrollmentId).then((data) => {
      if (cancelled) return;
      setPreview(data);
      if (data?.currentClassId) setToClassId(data.currentClassId);
      setLoadingPreview(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, enrollmentId, currentClassId]);

  const target = preview?.classes.find((cls) => cls.id === toClassId) ?? null;
  const targetPrice = useMemo(() => {
    if (!target) return 0;
    const slotPrice = target.pickOneSlot
      ? (target.slots.find((slot) => slot.id === weeklySlotId)?.price ?? null)
      : null;
    return classSlotPeriodPrice(target.price, target.billingMonths, slotPrice);
  }, [target, weeklySlotId]);

  const overCapacity =
    target != null &&
    target.id !== preview?.currentClassId &&
    target.capacity != null &&
    target.taken >= target.capacity;

  async function handleSave() {
    if (!toClassId) {
      setError("נא לבחור חוג.");
      return;
    }
    if (target?.pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await transferEnrollment({
      enrollmentId,
      toClassId,
      weeklySlotId: weeklySlotId || null,
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
        title="החלפה לחוג או מועד אחר"
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
                ההרשמה תעבור לחוג או למועד שנבחר. התשלום שכבר שולם נשאר עליה,
                ולא נפתח חיוב חדש בגבייה.
                {preview.alreadyPaid > 0
                  ? ` שולם עד כה ${formatCurrency(preview.alreadyPaid)}.`
                  : ""}
              </p>

              <Field label="חוג">
                <Select
                  value={toClassId}
                  onChange={(event) => {
                    setToClassId(event.target.value);
                    setWeeklySlotId("");
                    setError(null);
                  }}
                >
                  <option value="">בחרו חוג</option>
                  {preview.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.title}
                      {cls.id === preview.currentClassId ? " · נוכחי" : ""}
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
                        {slot.id === preview.currentWeeklySlotId
                          ? " · נוכחי"
                          : ""}
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
                  מחיר החוג: {formatCurrency(targetPrice)}
                  {overCapacity ? " · החוג מלא — ההחלפה תחרוג מהתפוסה." : ""}
                </p>
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
