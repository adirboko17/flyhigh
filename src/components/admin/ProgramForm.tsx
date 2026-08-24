"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityPriceTierEditor } from "@/components/admin/ActivityPriceTierEditor";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import {
  HAFUGA_EXTRA_HALF_HOUR_PRICE,
  activityStartingPrice,
  parseActivityPriceTiers,
  serializeActivityPriceTiers,
  validateActivityPriceTiers,
  type ActivityPriceTier,
} from "@/lib/finance/activityPricing";
import { isActivityProgram, type ProgramKind } from "@/lib/programs";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";
import { cn } from "@/utils/cn";

export type ProgramFormData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  kind: ProgramKind;
  status: "draft" | "active" | "inactive";
  price_tiers?: Json | null;
  extra_half_hour_price?: number | null;
};

const emptyForm = {
  title: "",
  description: "",
  price: "",
  duration_months: "1",
  kind: "membership" as ProgramKind,
  status: "active",
};

function toFormState(existing?: ProgramFormData, defaultKind?: ProgramKind) {
  if (!existing) {
    return { ...emptyForm, kind: defaultKind ?? "membership" };
  }
  return {
    title: existing.title,
    description: existing.description ?? "",
    price: existing.price.toString(),
    duration_months: String(existing.duration_months || 1),
    kind: existing.kind ?? defaultKind ?? "membership",
    status: existing.status,
  };
}

interface ProgramFormProps {
  existing?: ProgramFormData;
  /** סוג קבוע כשפותחים את הטופס מתוך סקציית מנויים או פעילויות. */
  defaultKind?: ProgramKind;
  /** מסופק כשהטופס רץ בתוך מודאל — סוגר במקום לנווט, ובלי כרטיס עוטף. */
  onClose?: () => void;
}

export function ProgramForm({
  existing,
  defaultKind,
  onClose,
}: ProgramFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const inModal = Boolean(onClose);
  const [form, setForm] = useState(() => toFormState(existing, defaultKind));
  const [priceTiers, setPriceTiers] = useState<ActivityPriceTier[]>(() =>
    parseActivityPriceTiers(existing?.price_tiers)
  );
  const [extraHalfHour, setExtraHalfHour] = useState(
    existing?.extra_half_hour_price != null
      ? String(existing.extra_half_hour_price)
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind: ProgramKind = isActivityProgram(form.kind)
    ? "activity"
    : "membership";
  const isActivity = kind === "activity";
  const usesGroupPricing = isActivity && priceTiers.length > 0;
  const tracksHash = isActivity ? "#activities" : "#programs";

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const durationMonths = isActivity
      ? 1
      : Math.floor(Number(form.duration_months));
    if (
      !isActivity &&
      (!Number.isFinite(durationMonths) || durationMonths < 1 || durationMonths > 36)
    ) {
      setError("נא לבחור משך מנוי בין חודש אחד ל־36 חודשים.");
      setLoading(false);
      return;
    }

    const tiers = isActivity ? priceTiers : [];
    const tiersError = validateActivityPriceTiers(tiers);
    if (tiersError) {
      setError(tiersError);
      setLoading(false);
      return;
    }

    const extraHalfHourPrice = isActivity
      ? extraHalfHour.trim() === ""
        ? null
        : Number(extraHalfHour)
      : null;
    if (
      extraHalfHourPrice != null &&
      (!Number.isFinite(extraHalfHourPrice) || extraHalfHourPrice < 0)
    ) {
      setError("תוספת חצי שעה חייבת להיות מספר תקין.");
      setLoading(false);
      return;
    }

    const unitPrice = Number(form.price) || 0;
    const payload = {
      title: form.title,
      description: form.description || null,
      price: activityStartingPrice(tiers, unitPrice),
      duration_months: durationMonths,
      kind,
      price_tiers: serializeActivityPriceTiers(tiers),
      extra_half_hour_price: extraHalfHourPrice,
      // פריט חדש נוצר תמיד כפעיל; שינוי סטטוס נעשה במסך העריכה.
      status: isEdit
        ? (form.status as "draft" | "active" | "inactive")
        : "active",
    };

    const dbError = isEdit
      ? (
          await supabase
            .from("programs")
            .update(payload)
            .eq("id", existing!.id)
        ).error
      : (await supabase.from("programs").insert(payload)).error;

    if (dbError) {
      setError(
        isActivity
          ? "אירעה שגיאה בשמירת הפעילות. בדקו את הפרטים ונסו שוב."
          : "אירעה שגיאה בשמירת המנוי. בדקו את הפרטים ונסו שוב."
      );
      setLoading(false);
      return;
    }

    await revalidatePublicCatalog();
    setLoading(false);
    router.refresh();

    if (onClose) onClose();
    else router.push(`/admin/tracks${tracksHash}`);
  }

  const fields = (
    <>
      <Field label={isActivity ? "שם הפעילות" : "שם המנוי"} required>
        <Input
          value={form.title}
          onChange={set("title")}
          placeholder={
            isActivity
              ? "לדוגמה: פעילות הפוגה"
              : "לדוגמה: מנוי חודשי — שחייה חופשית"
          }
          required
          autoFocus={inModal}
        />
      </Field>
      <Field label="תיאור">
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder={
            isActivity
              ? "פעילות חד־פעמית. הלקוח בוחר כמה משתתפים, משלם, ואז מתאמים מועד בטלפון."
              : "תיאור קצר של המנוי..."
          }
        />
      </Field>
      {isActivity ? (
        <div className="space-y-4">
          <Field label="איך מחשבים את המחיר">
            <Select
              value={usesGroupPricing ? "group" : "per_person"}
              onChange={(e) => {
                if (e.target.value === "per_person") {
                  setPriceTiers([]);
                  return;
                }
                if (priceTiers.length === 0) {
                  setPriceTiers([
                    { minPeople: 2, maxPeople: 2, price: 250, note: null },
                  ]);
                }
              }}
            >
              <option value="per_person">מחיר למשתתף × מספר האנשים</option>
              <option value="group">מחיר לפי גודל קבוצה</option>
            </Select>
          </Field>

          {usesGroupPricing ? (
            <Field label="מדרגות מחיר לקבוצה" required>
              <ActivityPriceTierEditor
                tiers={priceTiers}
                onChange={setPriceTiers}
                onFillHafuga={() =>
                  setExtraHalfHour(String(HAFUGA_EXTRA_HALF_HOUR_PRICE))
                }
                disabled={loading}
              />
            </Field>
          ) : (
            <Field label="מחיר למשתתף (₪)" required>
              <Input
                type="number"
                min={0}
                step="1"
                value={form.price}
                onChange={set("price")}
                required
              />
            </Field>
          )}

          <Field
            label="תוספת חצי שעה (₪)"
            hint="מוצג ללקוח בלבד. התוספת מתווספת בתיאום הטלפוני, לא בתשלום הראשוני."
          >
            <Input
              type="number"
              min={0}
              step="1"
              value={extraHalfHour}
              onChange={(e) => setExtraHalfHour(e.target.value)}
              placeholder="לדוגמה: 100"
            />
          </Field>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {usesGroupPricing
              ? "הלקוח בוחר כמה משתתפים ומשלם את מחיר המדרגה המתאימה לקבוצה. אחרי התשלום הבקשה מופיעה בתיאום מועדים."
              : "הלקוח בוחר כמה משתתפים ומשלם מחיר × מספר. אחרי התשלום הבקשה מופיעה בתיאום מועדים כדי לחייג ולתאם מועד."}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-5", isEdit ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          <Field label="מחיר (₪)" required>
            <Input
              type="number"
              min={0}
              step="1"
              value={form.price}
              onChange={set("price")}
              required
            />
          </Field>
          <Field label="משך המנוי" required hint="לפי זה תחושב התראת הסיום למנהל">
            <Select value={form.duration_months} onChange={set("duration_months")}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                <option key={months} value={months}>
                  {months === 1 ? "חודש אחד" : `${months} חודשים`}
                </option>
              ))}
              <option value="18">18 חודשים</option>
              <option value="24">24 חודשים</option>
              <option value="36">36 חודשים</option>
            </Select>
          </Field>
          {isEdit && (
            <Field label="סטטוס">
              <Select value={form.status} onChange={set("status")}>
                <option value="draft">טיוטה</option>
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
              </Select>
            </Field>
          )}
        </div>
      )}
      {isActivity && isEdit && (
        <Field label="סטטוס">
          <Select value={form.status} onChange={set("status")}>
            <option value="draft">טיוטה</option>
            <option value="active">פעיל</option>
            <option value="inactive">לא פעיל</option>
          </Select>
        </Field>
      )}
    </>
  );

  return (
    <form onSubmit={submit} className={inModal ? "space-y-5" : "space-y-6"}>
      {inModal ? (
        <div className="space-y-5">{fields}</div>
      ) : (
        <Card>
          <CardContent className="space-y-5">{fields}</CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size={inModal ? "md" : "lg"} disabled={loading}>
          {loading
            ? "שומר..."
            : isActivity
              ? isEdit
                ? "עדכון הפעילות"
                : "שמירת הפעילות"
              : isEdit
                ? "עדכון המנוי"
                : "שמירת המנוי"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={inModal ? "md" : "lg"}
          disabled={loading}
          onClick={() =>
            onClose ? onClose() : router.push(`/admin/tracks${tracksHash}`)
          }
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

/** @deprecated use ProgramForm */
export const NewProgramForm = ProgramForm;
