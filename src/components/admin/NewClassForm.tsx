"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type { Instructor } from "@/types";

interface Props {
  instructors: Pick<Instructor, "id" | "full_name">[];
}

const initial = {
  title: "",
  description: "",
  category: "שחייה",
  level: "",
  age_min: "",
  age_max: "",
  capacity: "10",
  price: "",
  start_date: "",
  end_date: "",
  day_of_week: "0",
  start_time: "",
  end_time: "",
  instructor_id: "",
  status: "draft",
  image_url: "",
};

export function NewClassForm({ instructors }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
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

    const { error: insertError } = await supabase.from("classes").insert({
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      level: form.level || null,
      age_min: form.age_min ? Number(form.age_min) : null,
      age_max: form.age_max ? Number(form.age_max) : null,
      capacity: Number(form.capacity) || 0,
      price: Number(form.price) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      instructor_id: form.instructor_id || null,
      status: form.status as "draft" | "active" | "full" | "closed",
      image_url: form.image_url || null,
    });

    if (insertError) {
      setError("אירעה שגיאה בשמירת החוג. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    router.push("/admin/classes");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <Field label="שם החוג" required>
            <Input value={form.title} onChange={set("title")} required />
          </Field>
          <Field label="תיאור">
            <Textarea value={form.description} onChange={set("description")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="קטגוריה">
              <Input value={form.category} onChange={set("category")} />
            </Field>
            <Field label="רמה">
              <Input value={form.level} onChange={set("level")} placeholder="מתחילים / מתקדמים" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="גיל מינימום">
              <Input type="number" min={0} value={form.age_min} onChange={set("age_min")} />
            </Field>
            <Field label="גיל מקסימום">
              <Input type="number" min={0} value={form.age_max} onChange={set("age_max")} />
            </Field>
            <Field label="מכסת משתתפים" required>
              <Input type="number" min={1} value={form.capacity} onChange={set("capacity")} required />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="מחיר (₪)" required>
              <Input type="number" min={0} step="1" value={form.price} onChange={set("price")} required />
            </Field>
            <Field label="מדריכה">
              <Select value={form.instructor_id} onChange={set("instructor_id")}>
                <option value="">ללא שיוך</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="יום בשבוע">
              <Select value={form.day_of_week} onChange={set("day_of_week")}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="שעת התחלה">
              <Input type="time" value={form.start_time} onChange={set("start_time")} />
            </Field>
            <Field label="שעת סיום">
              <Input type="time" value={form.end_time} onChange={set("end_time")} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="תאריך התחלה">
              <Input type="date" value={form.start_date} onChange={set("start_date")} />
            </Field>
            <Field label="תאריך סיום">
              <Input type="date" value={form.end_date} onChange={set("end_date")} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="קישור לתמונה">
              <Input dir="ltr" value={form.image_url} onChange={set("image_url")} placeholder="https://..." />
            </Field>
            <Field label="סטטוס">
              <Select value={form.status} onChange={set("status")}>
                <option value="draft">טיוטה</option>
                <option value="active">פעיל</option>
                <option value="full">מלא</option>
                <option value="closed">סגור</option>
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
          {loading ? "שומר..." : "שמירת החוג"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/classes")}
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}
