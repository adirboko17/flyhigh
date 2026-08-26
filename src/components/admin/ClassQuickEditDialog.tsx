"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminClassRow } from "@/components/admin/ClassList";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { parseBillingMonths } from "@/lib/finance/classPricing";
import { createClient } from "@/lib/supabase/client";

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
  const [price, setPrice] = useState(String(cls.price ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(cls.title);
    setCapacity(cls.capacity != null ? String(cls.capacity) : "");
    setInstructorId(cls.instructor_id ?? "");
    setPrice(String(cls.price ?? 0));
    setError(null);
  }, [cls]);

  const billingMonths = parseBillingMonths(cls.billing_months);
  const priceLabel = cls.interest_only
    ? "מחיר"
    : billingMonths
      ? "מחיר לחודש (₪)"
      : "מחיר (₪)";

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

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("classes")
      .update({
        title: nextTitle,
        capacity: nextCapacity,
        instructor_id: instructorId || null,
        price: nextPrice,
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

        <Field label="מדריך או מדריכה">
          <Select
            value={instructorId}
            onChange={(event) => setInstructorId(event.target.value)}
            disabled={saving}
          >
            <option value="">ללא שיוך</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.isSelf
                  ? `${instructor.full_name} (אני · מנהל)`
                  : instructor.full_name}
              </option>
            ))}
          </Select>
        </Field>

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
