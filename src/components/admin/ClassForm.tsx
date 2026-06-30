"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadClassImage } from "@/lib/storage/classImage";
import {
  emptyScheduleState,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";
import { saveClassSchedule } from "@/lib/scheduling/saveClassSchedule";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { ClassImageUpload } from "@/components/admin/ClassImageUpload";
import { ClassPreviewPanel } from "@/components/admin/ClassPreview";
import { ClassScheduleEditor } from "@/components/admin/ClassScheduleEditor";
import type { Instructor } from "@/types";

export type ClassFormData = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  age_min: number | null;
  age_max: number | null;
  capacity: number;
  price: number;
  instructor_id: string | null;
  status: "active" | "inactive" | "full";
  image_url: string | null;
  schedule_type?: "weekly" | "custom";
};

interface Props {
  instructors: Pick<Instructor, "id" | "full_name">[];
  existing?: ClassFormData;
  initialSchedule?: ClassScheduleState;
}

const emptyForm = {
  title: "",
  description: "",
  category: "שחייה",
  level: "",
  age_min: "",
  age_max: "",
  capacity: "10",
  price: "",
  instructor_id: "",
  image_url: "",
};

function toFormState(existing?: ClassFormData) {
  if (!existing) return emptyForm;
  return {
    title: existing.title,
    description: existing.description ?? "",
    category: existing.category ?? "שחייה",
    level: existing.level ?? "",
    age_min: existing.age_min?.toString() ?? "",
    age_max: existing.age_max?.toString() ?? "",
    capacity: existing.capacity.toString(),
    price: existing.price.toString(),
    instructor_id: existing.instructor_id ?? "",
    image_url: existing.image_url ?? "",
  };
}

function toPayload(
  form: ReturnType<typeof toFormState>,
  imageUrl: string | null,
  scheduleType: ClassScheduleState["scheduleType"],
  status: ClassFormData["status"]
) {
  return {
    title: form.title,
    description: form.description || null,
    category: form.category || null,
    level: form.level || null,
    age_min: form.age_min ? Number(form.age_min) : null,
    age_max: form.age_max ? Number(form.age_max) : null,
    capacity: Number(form.capacity) || 0,
    price: Number(form.price) || 0,
    instructor_id: form.instructor_id || null,
    status,
    image_url: imageUrl,
    schedule_type: scheduleType,
  };
}

function validateSchedule(schedule: ClassScheduleState): string | null {
  const active = schedule.sessions.filter((s) => s.status !== "cancelled");

  if (schedule.scheduleType === "weekly") {
    if (schedule.weeklySlots.length === 0) {
      return "בחרו לפחות יום אחד בשבוע.";
    }
    if (!schedule.rangeStart || !schedule.rangeEnd) {
      return "הגדירו טווח תאריכים ללוח הזמנים.";
    }
  }

  if (active.length === 0) {
    return schedule.scheduleType === "custom"
      ? "הוסיפו לפחות מפגש אחד."
      : "לחצו על «יצירת / עדכון רשימת מפגשים» לפני השמירה.";
  }

  for (const session of active) {
    if (!session.sessionDate || !session.startTime || !session.endTime) {
      return "מלאו תאריך ושעות לכל המפגשים.";
    }
  }

  return null;
}

export function ClassForm({ instructors, existing, initialSchedule }: Props) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [form, setForm] = useState(() => toFormState(existing));
  const [schedule, setSchedule] = useState(
    () => initialSchedule ?? emptyScheduleState()
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const previewImageUrl = imagePreviewUrl || form.image_url.trim() || null;

  const instructorName = useMemo(() => {
    if (!form.instructor_id) return null;
    return (
      instructors.find((i) => i.id === form.instructor_id)?.full_name ?? null
    );
  }, [form.instructor_id, instructors]);

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleImageSelect(file: File) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setError(null);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleImageClear() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setForm((f) => ({ ...f, image_url: "" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const scheduleError = validateSchedule(schedule);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    let imageUrl = form.image_url.trim() || null;

    if (imageFile) {
      const upload = await uploadClassImage(supabase, imageFile);
      if (upload.error) {
        setError(upload.error);
        setLoading(false);
        return;
      }
      imageUrl = upload.url ?? null;
    }

    const payload = toPayload(
      form,
      imageUrl,
      schedule.scheduleType,
      existing?.status ?? "active"
    );

    let classId = existing?.id;

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("classes")
        .update(payload)
        .eq("id", existing!.id);

      if (updateError) {
        setError("אירעה שגיאה בשמירת החוג. בדקו את הפרטים ונסו שוב.");
        setLoading(false);
        return;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("classes")
        .insert(payload)
        .select("id")
        .single();

      if (insertError || !inserted) {
        setError("אירעה שגיאה בשמירת החוג. בדקו את הפרטים ונסו שוב.");
        setLoading(false);
        return;
      }

      classId = inserted.id;
    }

    const scheduleSave = await saveClassSchedule(supabase, classId!, schedule);
    if (scheduleSave.error) {
      setError(scheduleSave.error);
      setLoading(false);
      return;
    }

    router.push("/admin/classes");
    router.refresh();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
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
                <Input
                  value={form.level}
                  onChange={set("level")}
                  placeholder="מתחילים / מתקדמים"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="גיל מינימום">
                <Input
                  type="number"
                  min={0}
                  value={form.age_min}
                  onChange={set("age_min")}
                />
              </Field>
              <Field label="גיל מקסימום">
                <Input
                  type="number"
                  min={0}
                  value={form.age_max}
                  onChange={set("age_max")}
                />
              </Field>
              <Field label="מכסת משתתפים" required>
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={set("capacity")}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
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
            <ClassScheduleEditor
              value={schedule}
              onChange={setSchedule}
              disabled={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <ClassImageUpload
              displayUrl={previewImageUrl}
              onFileSelect={handleImageSelect}
              onClear={handleImageClear}
              onValidationError={setError}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "שומר..." : isEdit ? "עדכון החוג" : "שמירת החוג"}
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

      <ClassPreviewPanel
        form={form}
        schedule={schedule}
        imageUrl={previewImageUrl}
        instructorName={instructorName}
        previewStatus={existing?.status ?? "active"}
      />
    </div>
  );
}

/** @deprecated use ClassForm */
export const NewClassForm = ClassForm;
