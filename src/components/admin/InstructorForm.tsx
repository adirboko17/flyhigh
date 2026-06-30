"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";

export type InstructorFormData = {
  id: string;
  full_name: string;
  phone: string | null;
  hourly_rate: number | null;
  status: "active" | "inactive";
};

const emptyForm = {
  full_name: "",
  phone: "",
  hourly_rate: "",
  status: "active",
};

function toFormState(existing?: InstructorFormData) {
  if (!existing) return emptyForm;
  return {
    full_name: existing.full_name,
    phone: existing.phone ?? "",
    hourly_rate: existing.hourly_rate?.toString() ?? "",
    status: existing.status,
  };
}

export function InstructorForm({ existing }: { existing?: InstructorFormData }) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [form, setForm] = useState(() => toFormState(existing));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      status: form.status as "active" | "inactive",
    };

    const dbError = isEdit
      ? (
          await supabase
            .from("instructors")
            .update(payload)
            .eq("id", existing!.id)
        ).error
      : (await supabase.from("instructors").insert(payload)).error;

    if (dbError) {
      setError("אירעה שגיאה בשמירת המדריכה. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    router.push("/admin/instructors");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <Field label="שם מלא" required>
            <Input
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="לדוגמה: דנה כהן"
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="טלפון">
              <Input
                dir="ltr"
                value={form.phone}
                onChange={set("phone")}
                placeholder="052-7654321"
              />
            </Field>
            <Field label="תעריף שעתי (₪)">
              <Input
                type="number"
                min={0}
                step="1"
                value={form.hourly_rate}
                onChange={set("hourly_rate")}
              />
            </Field>
          </div>
          <Field label="סטטוס">
            <Select value={form.status} onChange={set("status")}>
              <option value="active">פעילה</option>
              <option value="inactive">לא פעילה</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "עדכון המדריכה" : "שמירת המדריכה"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/instructors")}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

/** @deprecated use InstructorForm */
export const NewInstructorForm = InstructorForm;
