"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";

export type PoolPassFormData = {
  id: string;
  title: string;
  description: string | null;
  entries_count: number;
  price: number;
  status: "draft" | "active" | "inactive";
};

const emptyForm = {
  title: "",
  description: "",
  entries_count: "1",
  price: "",
  status: "active",
};

function toFormState(existing?: PoolPassFormData) {
  if (!existing) return emptyForm;
  return {
    title: existing.title,
    description: existing.description ?? "",
    entries_count: existing.entries_count.toString(),
    price: existing.price.toString(),
    status: existing.status,
  };
}

export function PoolPassForm({ existing }: { existing?: PoolPassFormData }) {
  const router = useRouter();
  const isEdit = Boolean(existing);
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
      entries_count: Number(form.entries_count) || 1,
      price: Number(form.price) || 0,
      status: form.status as "draft" | "active" | "inactive",
    };

    const dbError = isEdit
      ? (
          await supabase
            .from("pool_passes")
            .update(payload)
            .eq("id", existing!.id)
        ).error
      : (await supabase.from("pool_passes").insert(payload)).error;

    if (dbError) {
      setError("אירעה שגיאה בשמירת הכניסה. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    router.push("/admin/pool-passes");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <Field label="שם" required>
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="לדוגמה: כרטיסייה — 10 כניסות"
              required
            />
          </Field>
          <Field label="תיאור">
            <Textarea
              value={form.description}
              onChange={set("description")}
              placeholder="תיאור קצר..."
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="מספר כניסות" required>
              <Input
                type="number"
                min={1}
                value={form.entries_count}
                onChange={set("entries_count")}
                required
              />
            </Field>
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
            <Field label="סטטוס">
              <Select value={form.status} onChange={set("status")}>
                <option value="draft">טיוטה</option>
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "עדכון הכניסה" : "שמירת הכניסה"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/pool-passes")}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

/** @deprecated use PoolPassForm */
export const NewPoolPassForm = PoolPassForm;
