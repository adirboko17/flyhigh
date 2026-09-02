"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminClassRow } from "@/components/admin/ClassList";
import { InstructorSelect } from "@/components/admin/InstructorSelect";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { parseBillingMonths } from "@/lib/finance/classPricing";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import { createClient } from "@/lib/supabase/client";

function slotInstructorMap(cls: AdminClassRow) {
  return Object.fromEntries(
    cls.slots.map((slot) => [
      slot.id,
      slot.instructor_id ?? cls.instructor_id ?? "",
    ])
  );
}

export function ClassQuickEditDialog({
  cls,
  instructors,
  onClose,
}: {
  cls: AdminClassRow;
  instructors: ClassInstructorOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(cls.title);
  const [capacity, setCapacity] = useState(
    cls.capacity != null ? String(cls.capacity) : ""
  );
  const [instructorId, setInstructorId] = useState(cls.instructor_id ?? "");
  const [slotInstructors, setSlotInstructors] = useState(slotInstructorMap(cls));
  const [price, setPrice] = useState(String(cls.price ?? 0));
  const [trialEnabled, setTrialEnabled] = useState(
    cls.trial_lesson_price != null
  );
  const [trialPrice, setTrialPrice] = useState(
    cls.trial_lesson_price != null ? String(cls.trial_lesson_price) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(cls.title);
    setCapacity(cls.capacity != null ? String(cls.capacity) : "");
    setInstructorId(cls.instructor_id ?? "");
    setSlotInstructors(slotInstructorMap(cls));
    setPrice(String(cls.price ?? 0));
    setTrialEnabled(cls.trial_lesson_price != null);
    setTrialPrice(
      cls.trial_lesson_price != null ? String(cls.trial_lesson_price) : ""
    );
    setError(null);
  }, [cls]);

  const billingMonths = parseBillingMonths(cls.billing_months);
  const priceLabel = cls.interest_only
    ? "מחיר"
    : billingMonths
      ? "מחיר לחודש (₪)"
      : "מחיר (₪)";
  const hasSlots = cls.slots.length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("נא למלא את שם החוג.");
      return;
    }

    const capacityRaw = capacity.trim();
    let nextCapacity: number | null = null;
    if (capacityRaw) {
      const parsed = Number(capacityRaw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        setError("כמות המשתתפים חייבת להיות מספר שלם, או ריקה ללא הגבלה.");
        return;
      }
      if (parsed < cls.registeredCount) {
        setError(
          `יש כבר ${cls.registeredCount} נרשמים. המכסה לא יכולה להיות נמוכה יותר.`
        );
        return;
      }
      nextCapacity = parsed;
    }

    let nextPrice = cls.price;
    if (!cls.interest_only) {
      if (price.trim() === "" || Number(price) < 0 || !Number.isFinite(Number(price))) {
        setError("נא למלא את מחיר החוג.");
        return;
      }
      nextPrice = Number(price);
    }

    const offerTrial =
      !cls.interest_only && cls.booking_mode !== "appointment" && trialEnabled;
    let nextTrialPrice: number | null = null;
    if (offerTrial) {
      if (
        trialPrice.trim() === "" ||
        Number(trialPrice) < 0 ||
        !Number.isFinite(Number(trialPrice))
      ) {
        setError("נא למלא את מחיר שיעור הניסיון, או לבטל את האפשרות.");
        return;
      }
      nextTrialPrice = Number(trialPrice);
    }

    const nextClassInstructorId = hasSlots
      ? cls.slots.map((slot) => slotInstructors[slot.id]).find(Boolean) || null
      : instructorId || null;

    setSaving(true);
    const supabase = createClient();

    if (hasSlots) {
      for (const slot of cls.slots) {
        const { error: slotError } = await supabase
          .from("class_weekly_slots")
          .update({ instructor_id: slotInstructors[slot.id] || null })
          .eq("id", slot.id);
        if (slotError) {
          setError("שמירת המדריך למועד נכשלה. בדקו את הפרטים ונסו שוב.");
          setSaving(false);
          return;
        }
      }
    }

    const { error: updateError } = await supabase
      .from("classes")
      .update({
        title: nextTitle,
        capacity: nextCapacity,
        instructor_id: nextClassInstructorId,
        price: nextPrice,
        trial_lesson_price: nextTrialPrice,
        ...(!nextCapacity && cls.status === "full" ? { status: "active" as const } : {}),
      })
      .eq("id", cls.id);

    if (updateError) {
      setError("שמירת החוג נכשלה. בדקו את הפרטים ונסו שוב.");
      setSaving(false);
      return;
    }

    await revalidatePublicCatalog();
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="עריכה מהירה"
      description={cls.title}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="שם החוג" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={saving}
          />
        </Field>

        <Field
          label="כמות משתתפים"
          hint="השאירו ריק אם אין הגבלת מקומות"
        >
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            placeholder="ללא הגבלה"
            disabled={saving}
          />
        </Field>

        {hasSlots ? (
          cls.slots.map((slot) => (
            <Field
              key={slot.id}
              label={
                cls.slots.length > 1
                  ? `מדריך · ${formatWeeklySlotLabel(
                      slot.day_of_week,
                      slot.start_time,
                      slot.end_time,
                      slot.gender_policy
                    )}`
                  : "מדריך או מדריכה"
              }
            >
              <InstructorSelect
                value={slotInstructors[slot.id] ?? ""}
                onChange={(nextId) =>
                  setSlotInstructors((current) => ({
                    ...current,
                    [slot.id]: nextId,
                  }))
                }
                instructors={instructors}
                disabled={saving}
              />
            </Field>
          ))
        ) : (
          <Field label="מדריך או מדריכה">
            <InstructorSelect
              value={instructorId}
              onChange={setInstructorId}
              instructors={instructors}
              disabled={saving}
            />
          </Field>
        )}

        <Field
          label={priceLabel}
          required={!cls.interest_only}
          hint={
            cls.interest_only
              ? "הרשמת עניין — בלי תשלום"
              : billingMonths
                ? `החוג מתומחר לפי חודש × ${billingMonths}`
                : undefined
          }
        >
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="decimal"
            value={cls.interest_only ? "0" : price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={saving || cls.interest_only}
          />
        </Field>

        {!cls.interest_only && cls.booking_mode !== "appointment" && (
          <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                checked={trialEnabled}
                disabled={saving}
                onChange={(event) => setTrialEnabled(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-ink-900">
                  שיעור ניסיון
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  כניסה למפגש אחד במחיר נפרד
                </span>
              </span>
            </label>
            {trialEnabled && (
              <Field label="מחיר שיעור ניסיון (₪)" required>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="decimal"
                  value={trialPrice}
                  onChange={(event) => setTrialPrice(event.target.value)}
                  disabled={saving}
                />
              </Field>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            ביטול
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
