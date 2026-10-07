"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import {
  QuantityPackageFields,
  type PackageDraft,
} from "@/components/admin/QuantityPackageFields";
import { TrackScheduleFields } from "@/components/admin/TrackScheduleFields";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import {
  columnsFromPackages,
  normalizePackageDraft,
  packagesFromProduct,
} from "@/lib/catalog/quantityPackages";
import { cn } from "@/utils/cn";
import type { Json } from "@/types/database.types";

export type PrivateLessonFormData = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  lessons_count: number;
  price: number;
  price_tiers?: Json | null;
  status: "draft" | "active" | "inactive";
  requires_schedule: boolean;
  instructor_id: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  duration_minutes: "45",
  packages: [{ quantity: "1", price: "" }] as PackageDraft[],
  status: "active" as const,
  requires_schedule: true,
  instructor_id: "",
};

function toFormState(existing?: PrivateLessonFormData) {
  if (!existing) return emptyForm;
  const packages = packagesFromProduct(
    existing.lessons_count,
    existing.price,
    existing.price_tiers
  );
  return {
    title: existing.title,
    description: existing.description ?? "",
    duration_minutes: existing.duration_minutes.toString(),
    packages: packages.map((pack) => ({
      quantity: String(pack.quantity),
      price: String(pack.price),
    })),
    status: existing.status,
    requires_schedule: existing.requires_schedule,
    instructor_id: existing.instructor_id ?? "",
  };
}

interface PrivateLessonFormProps {
  existing?: PrivateLessonFormData;
  instructors?: ClassInstructorOption[];
  onClose?: () => void;
}

export function PrivateLessonForm({
  existing,
  instructors = [],
  onClose,
}: PrivateLessonFormProps) {
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

    const duration = Number(form.duration_minutes);
    if (!Number.isFinite(duration) || duration < 1) {
      setError("נא להזין משך שיעור תקין בדקות.");
      setLoading(false);
      return;
    }
    const normalized = normalizePackageDraft(form.packages);
    if (!normalized.ok) {
      setError(normalized.error);
      setLoading(false);
      return;
    }
    const saved = columnsFromPackages(normalized.packages);

    const payload = {
      title: form.title,
      description: form.description || null,
      duration_minutes: duration,
      lessons_count: saved.count,
      price: saved.price,
      price_tiers: saved.price_tiers,
      requires_schedule: form.requires_schedule,
      instructor_id: form.instructor_id || null,
      status: isEdit
        ? (form.status as "draft" | "active" | "inactive")
        : "active",
    };

    const dbError = isEdit
      ? (
          await supabase
            .from("private_lessons")
            .update(payload)
            .eq("id", existing!.id)
        ).error
      : (await supabase.from("private_lessons").insert(payload)).error;

    if (dbError) {
      setError("אירעה שגיאה בשמירת השיעור. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    await revalidatePublicCatalog();
    setLoading(false);
    router.refresh();

    if (onClose) onClose();
    else router.push("/admin/tracks#private-lessons");
  }

  const fields = (
    <>
      <Field label="שם" required>
        <Input
          value={form.title}
          onChange={set("title")}
          placeholder="לדוגמה: שיעור פרטי שחייה"
          required
          autoFocus={inModal}
        />
      </Field>
      <Field label="תיאור">
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="תיאור קצר..."
        />
      </Field>
      <div
        className={cn("grid gap-5 sm:grid-cols-2", isEdit && "sm:grid-cols-3")}
      >
        <Field label="משך (דקות)" required>
          <Input
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={set("duration_minutes")}
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
      <QuantityPackageFields
        unitPlural="שיעורים"
        unitSingular="שיעור"
        rows={form.packages}
        disabled={loading}
        onChange={(packages) => setForm((current) => ({ ...current, packages }))}
      />
      <TrackScheduleFields
        requiresSchedule={form.requires_schedule}
        instructorId={form.instructor_id}
        instructors={instructors}
        onRequiresScheduleChange={(value) =>
          setForm((current) => ({ ...current, requires_schedule: value }))
        }
        onInstructorChange={(instructorId) =>
          setForm((current) => ({ ...current, instructor_id: instructorId }))
        }
        disabled={loading}
      />
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
          {loading ? "שומר..." : isEdit ? "עדכון השיעור" : "שמירת השיעור"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={inModal ? "md" : "lg"}
          disabled={loading}
          onClick={() =>
            onClose ? onClose() : router.push("/admin/tracks#private-lessons")
          }
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}
