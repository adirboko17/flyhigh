"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { isActivityProgram, type ProgramKind } from "@/lib/programs";
import { cn } from "@/utils/cn";

export type ProgramFormData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  kind: ProgramKind;
  status: "draft" | "active" | "inactive";
};

const emptyForm = {
  title: "",
  description: "",
  price: "",
  duration_months: "1",
  kind: "membership" as ProgramKind,
  status: "active",
};

function toFormState(existing?: ProgramFormData) {
  if (!existing) return emptyForm;
  return {
    title: existing.title,
    description: existing.description ?? "",
    price: existing.price.toString(),
    duration_months: String(existing.duration_months || 1),
    kind: existing.kind ?? "membership",
    status: existing.status,
  };
}

interface ProgramFormProps {
  existing?: ProgramFormData;
  /** מסופק כשהטופס רץ בתוך מודאל — סוגר במקום לנווט, ובלי כרטיס עוטף. */
  onClose?: () => void;
}

export function ProgramForm({ existing, onClose }: ProgramFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const inModal = Boolean(onClose);
  const [form, setForm] = useState(() => toFormState(existing));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const kind: ProgramKind = form.kind === "activity" ? "activity" : "membership";
    const durationMonths = kind === "activity"
      ? 1
      : Math.floor(Number(form.duration_months));
    if (
      kind === "membership" &&
      (!Number.isFinite(durationMonths) || durationMonths < 1 || durationMonths > 36)
    ) {
      setError("נא לבחור משך מנוי בין חודש אחד ל־36 חודשים.");
      setLoading(false);
      return;
    }

    const payload = {
      title: form.title,
      description: form.description || null,
      price: Number(form.price) || 0,
      duration_months: durationMonths,
      kind,
      // מסלול חדש נוצר תמיד כפעיל; שינוי סטטוס נעשה במסך העריכה.
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
      setError("אירעה שגיאה בשמירת המסלול. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    await revalidatePublicCatalog();
    setLoading(false);
    router.refresh();

    if (onClose) onClose();
    else router.push("/admin/tracks#programs");
  }

  const fields = (
    <>
      <Field label="שם המסלול" required>
        <Input
          value={form.title}
          onChange={set("title")}
          placeholder={
            isActivityProgram(form.kind)
              ? "לדוגמה: פעילות הפוגה"
              : "לדוגמה: מנוי חודשי — שחייה חופשית"
          }
          required
          autoFocus={inModal}
        />
      </Field>
      <Field label="סוג" required>
        <Select value={form.kind} onChange={set("kind")}>
          <option value="membership">מנוי לפי תוקף</option>
          <option value="activity">פעילות לפי מספר נפשות</option>
        </Select>
      </Field>
      <Field label="תיאור">
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder={
            isActivityProgram(form.kind)
              ? "פעילות חד־פעמית. הלקוח בוחר כמה נפשות, משלם, ואז מתאמים מועד."
              : "תיאור קצר של המסלול..."
          }
        />
      </Field>
      <div className={cn("grid gap-5", isEdit ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <Field
          label={isActivityProgram(form.kind) ? "מחיר לנפש (₪)" : "מחיר (₪)"}
          required
        >
          <Input
            type="number"
            min={0}
            step="1"
            value={form.price}
            onChange={set("price")}
            required
          />
        </Field>
        {isActivityProgram(form.kind) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-1">
            הלקוח בוחר כמה נפשות ומשלם לפי זה. אחרי התשלום ניצור קשר לתיאום מועד.
          </div>
        ) : (
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
        )}
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
          {loading ? "שומר..." : isEdit ? "עדכון המסלול" : "שמירת המסלול"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={inModal ? "md" : "lg"}
          disabled={loading}
          onClick={() =>
            onClose ? onClose() : router.push("/admin/tracks#programs")
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
