"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import {
  COUPON_CODE_MAX_LENGTH,
  COUPON_CODE_MIN_LENGTH,
  isValidCouponCode,
  normalizeCouponCode,
  type CouponDiscountType,
} from "@/lib/finance/coupon";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";

export type CouponFormData = {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  parent_id: string | null;
  class_id: string | null;
  program_id: string | null;
  pool_pass_id: string | null;
  private_lesson_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

export type CouponOption = { id: string; label: string };

export type CouponOptions = {
  parents: CouponOption[];
  classes: CouponOption[];
  programs: CouponOption[];
  poolPasses: CouponOption[];
  privateLessons: CouponOption[];
};

/** הפריט שעליו חל הקופון מקודד כמחרוזת אחת, כי הוא נבחר מרשימה מאוחדת. */
type SubjectValue = string;

const ALL_SUBJECTS: SubjectValue = "";

function toSubjectValue(coupon?: CouponFormData): SubjectValue {
  if (!coupon) return ALL_SUBJECTS;
  if (coupon.class_id) return `class:${coupon.class_id}`;
  if (coupon.program_id) return `program:${coupon.program_id}`;
  if (coupon.pool_pass_id) return `pool_pass:${coupon.pool_pass_id}`;
  if (coupon.private_lesson_id)
    return `private_lesson:${coupon.private_lesson_id}`;
  return ALL_SUBJECTS;
}

function fromSubjectValue(value: SubjectValue) {
  const [kind, id] = value.split(":");
  return {
    class_id: kind === "class" ? id : null,
    program_id: kind === "program" ? id : null,
    pool_pass_id: kind === "pool_pass" ? id : null,
    private_lesson_id: kind === "private_lesson" ? id : null,
  };
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function toFormState(existing?: CouponFormData) {
  return {
    code: existing?.code ?? "",
    description: existing?.description ?? "",
    discountType: existing?.discount_type ?? ("percent" as CouponDiscountType),
    discountValue: existing ? String(existing.discount_value) : "10",
    audience: existing?.parent_id ? "one" : "all",
    parentId: existing?.parent_id ?? "",
    subject: toSubjectValue(existing),
    validity: existing?.starts_on || existing?.ends_on ? "range" : "always",
    startsOn: existing?.starts_on ?? "",
    endsOn: existing?.ends_on ?? "",
    usage: existing?.max_uses === null || !existing ? "unlimited" : "limited",
    maxUses: existing?.max_uses ? String(existing.max_uses) : "50",
    isActive: existing?.is_active ?? true,
  };
}

interface CouponFormProps {
  existing?: CouponFormData;
  options: CouponOptions;
  onClose: () => void;
}

export function CouponForm({ existing, options, onClose }: CouponFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [form, setForm] = useState(() => toFormState(existing));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!isValidCouponCode(form.code)) {
      return `קוד הקופון חייב להכיל בין ${COUPON_CODE_MIN_LENGTH} ל־${COUPON_CODE_MAX_LENGTH} תווים.`;
    }

    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      return "גובה ההנחה חייב להיות גדול מאפס.";
    }
    if (form.discountType === "percent" && value > 100) {
      return "הנחה באחוזים לא יכולה לעלות על 100%.";
    }
    if (form.audience === "one" && !form.parentId) {
      return "נא לבחור לקוח, או להחיל את הקופון על כל הלקוחות.";
    }
    if (form.validity === "range" && !form.startsOn && !form.endsOn) {
      return "נא למלא תאריך התחלה או תאריך סיום.";
    }
    if (
      form.validity === "range" &&
      form.startsOn &&
      form.endsOn &&
      form.endsOn < form.startsOn
    ) {
      return "תאריך הסיום חייב להיות אחרי תאריך ההתחלה.";
    }
    if (form.usage === "limited" && !(Number(form.maxUses) > 0)) {
      return "מספר השימושים חייב להיות גדול מאפס.";
    }

    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    const payload = {
      code: normalizeCouponCode(form.code),
      description: form.description.trim() || null,
      discount_type: form.discountType,
      discount_value: Number(form.discountValue),
      parent_id: form.audience === "one" ? form.parentId : null,
      ...fromSubjectValue(form.subject),
      starts_on: form.validity === "range" ? form.startsOn || null : null,
      ends_on: form.validity === "range" ? form.endsOn || null : null,
      max_uses: form.usage === "limited" ? Number(form.maxUses) : null,
      is_active: isEdit ? form.isActive : true,
    };

    const supabase = createClient();
    const { error: dbError } = isEdit
      ? await supabase
          .from("coupons")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing!.id)
      : await supabase.from("coupons").insert(payload);

    setLoading(false);

    if (dbError) {
      setError(
        dbError.code === "23505"
          ? "קוד הקופון כבר קיים במערכת. בחרו קוד אחר."
          : "שמירת הקופון נכשלה. בדקו את הפרטים ונסו שוב."
      );
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field
        label="קוד הקופון"
        required
        hint="הלקוחות יקלידו את הקוד בעמוד התשלום. אותיות גדולות באנגלית וספרות."
      >
        <div className="flex gap-2">
          <Input
            value={form.code}
            onChange={(e) => set("code", normalizeCouponCode(e.target.value))}
            placeholder="SUMMER25"
            dir="ltr"
            className="text-right font-mono tracking-wider"
            maxLength={COUPON_CODE_MAX_LENGTH}
            required
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => set("code", randomCode())}
          >
            הגרלה
          </Button>
        </div>
      </Field>

      <Field label="תיאור פנימי">
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="לדוגמה: מבצע הרשמה מוקדמת לקיץ"
          className="min-h-16"
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800">
          סוג ההנחה<span className="mr-0.5 text-red-500">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            name="discount-type"
            label="אחוז מהסכום"
            selected={form.discountType === "percent"}
            onSelect={() => set("discountType", "percent")}
          />
          <ChoiceCard
            name="discount-type"
            label="סכום קבוע בשקלים"
            selected={form.discountType === "fixed"}
            onSelect={() => set("discountType", "fixed")}
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={form.discountType === "percent" ? 100 : undefined}
            step={form.discountType === "percent" ? "0.5" : "1"}
            value={form.discountValue}
            onChange={(e) => set("discountValue", e.target.value)}
            className="w-32"
            aria-label="גובה ההנחה"
            required
          />
          <span className="text-sm text-ink-600">
            {form.discountType === "percent" ? "% מהסכום לתשלום" : "₪ הנחה מהסכום"}
          </span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800">
          למי הקופון מיועד
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            name="audience"
            label="כל הלקוחות"
            selected={form.audience === "all"}
            onSelect={() => set("audience", "all")}
          />
          <ChoiceCard
            name="audience"
            label="לקוח מסוים"
            selected={form.audience === "one"}
            onSelect={() => set("audience", "one")}
          />
        </div>
        {form.audience === "one" && (
          <Select
            value={form.parentId}
            onChange={(e) => set("parentId", e.target.value)}
            className="mt-3"
            aria-label="בחירת לקוח"
          >
            <option value="">בחרו לקוח...</option>
            {options.parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.label}
              </option>
            ))}
          </Select>
        )}
      </fieldset>

      <Field
        label="על מה הקופון חל"
        hint="בחירת פריט מסוים תגביל את הקופון רק אליו."
      >
        <Select
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
        >
          <option value={ALL_SUBJECTS}>כל מה שבעמוד התשלום</option>
          {options.classes.length > 0 && (
            <optgroup label="חוגים">
              {options.classes.map((item) => (
                <option key={item.id} value={`class:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          )}
          {options.programs.length > 0 && (
            <optgroup label="מנויים ופעילויות">
              {options.programs.map((item) => (
                <option key={item.id} value={`program:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          )}
          {options.poolPasses.length > 0 && (
            <optgroup label="כניסות לבריכה">
              {options.poolPasses.map((item) => (
                <option key={item.id} value={`pool_pass:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          )}
          {options.privateLessons.length > 0 && (
            <optgroup label="שיעורים פרטיים">
              {options.privateLessons.map((item) => (
                <option key={item.id} value={`private_lesson:${item.id}`}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800">
          תוקף הקופון
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            name="validity"
            label="זמין תמיד"
            selected={form.validity === "always"}
            onSelect={() => set("validity", "always")}
          />
          <ChoiceCard
            name="validity"
            label="טווח תאריכים"
            selected={form.validity === "range"}
            onSelect={() => set("validity", "range")}
          />
        </div>
        {form.validity === "range" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="מתאריך">
              <Input
                type="date"
                value={form.startsOn}
                onChange={(e) => set("startsOn", e.target.value)}
              />
            </Field>
            <Field label="עד תאריך">
              <Input
                type="date"
                value={form.endsOn}
                min={form.startsOn || undefined}
                onChange={(e) => set("endsOn", e.target.value)}
              />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-800">
          הגבלת שימושים
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ChoiceCard
            name="usage"
            label="ללא הגבלה"
            selected={form.usage === "unlimited"}
            onSelect={() => set("usage", "unlimited")}
          />
          <ChoiceCard
            name="usage"
            label="מספר שימושים מוגבל"
            selected={form.usage === "limited"}
            onSelect={() => set("usage", "limited")}
          />
        </div>
        {form.usage === "limited" && (
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              step="1"
              value={form.maxUses}
              onChange={(e) => set("maxUses", e.target.value)}
              className="w-32"
              aria-label="מספר שימושים מרבי"
            />
            <span className="text-sm text-ink-600">
              פעמים בסך הכול
              {existing && existing.used_count > 0 && (
                <span className="text-ink-400">
                  {" "}
                  · נוצלו עד כה {existing.used_count}
                </span>
              )}
            </span>
          </div>
        )}
      </fieldset>

      {isEdit && (
        <label className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-4 py-3">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded text-brand-600 focus:ring-brand-300"
          />
          <span className="text-sm font-medium text-ink-700">
            הקופון פעיל וניתן למימוש
          </span>
        </label>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "עדכון הקופון" : "יצירת הקופון"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={onClose}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

function ChoiceCard({
  name,
  label,
  selected,
  onSelect,
}: {
  name: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
        selected
          ? "border-brand-500 bg-brand-50 text-brand-800"
          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
      )}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 text-brand-600 focus:ring-brand-300"
      />
      {label}
    </label>
  );
}
