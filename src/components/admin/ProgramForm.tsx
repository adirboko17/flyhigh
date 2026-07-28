"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

export type ProgramFormData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: "draft" | "active" | "inactive";
};

const emptyForm = {
  title: "",
  description: "",
  price: "",
  status: "active",
};

function toFormState(existing?: ProgramFormData) {
  if (!existing) return emptyForm;
  return {
    title: existing.title,
    description: existing.description ?? "",
    price: existing.price.toString(),
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

    const payload = {
      title: form.title,
      description: form.description || null,
      price: Number(form.price) || 0,
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
          placeholder="לדוגמה: מנוי חודשי — שחייה חופשית"
          required
          autoFocus={inModal}
        />
      </Field>
      <Field label="תיאור">
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="תיאור קצר של המסלול..."
        />
      </Field>
      <div className={cn("grid gap-5", isEdit && "sm:grid-cols-2")}>
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
