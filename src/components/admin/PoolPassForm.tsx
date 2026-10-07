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
import type { Json } from "@/types/database.types";

export type PoolPassFormData = {
  id: string;
  title: string;
  description: string | null;
  entries_count: number;
  price: number;
  price_tiers?: Json | null;
  status: "draft" | "active" | "inactive";
  requires_schedule: boolean;
  instructor_id: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  packages: [{ quantity: "1", price: "" }] as PackageDraft[],
  status: "active" as const,
  requires_schedule: false,
  instructor_id: "",
};

function toFormState(existing?: PoolPassFormData) {
  if (!existing) return emptyForm;
  const packages = packagesFromProduct(
    existing.entries_count,
    existing.price,
    existing.price_tiers
  );
  return {
    title: existing.title,
    description: existing.description ?? "",
    packages: packages.map((pack) => ({
      quantity: String(pack.quantity),
      price: String(pack.price),
    })),
    status: existing.status,
    requires_schedule: existing.requires_schedule,
    instructor_id: existing.instructor_id ?? "",
  };
}

interface PoolPassFormProps {
  existing?: PoolPassFormData;
  instructors?: ClassInstructorOption[];
  /** מסופק כשהטופס רץ בתוך מודאל — סוגר במקום לנווט, ובלי כרטיס עוטף. */
  onClose?: () => void;
}

export function PoolPassForm({
  existing,
  instructors = [],
  onClose,
}: PoolPassFormProps) {
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
      entries_count: saved.count,
      price: saved.price,
      price_tiers: saved.price_tiers,
      requires_schedule: form.requires_schedule,
      instructor_id: form.instructor_id || null,
      // כניסה חדשה נוצרת תמיד כפעילה; שינוי סטטוס נעשה במסך העריכה.
      status: isEdit
        ? (form.status as "draft" | "active" | "inactive")
        : "active",
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

    await revalidatePublicCatalog();
    setLoading(false);
    router.refresh();

    if (onClose) onClose();
    else router.push("/admin/tracks#pool-passes");
  }

  const fields = (
    <>
      <Field label="שם" required>
        <Input
          value={form.title}
          onChange={set("title")}
          placeholder="לדוגמה: כרטיסייה — 10 כניסות"
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
      {isEdit && (
        <Field label="סטטוס">
          <Select value={form.status} onChange={set("status")}>
            <option value="draft">טיוטה</option>
            <option value="active">פעיל</option>
            <option value="inactive">לא פעיל</option>
          </Select>
        </Field>
      )}
      <QuantityPackageFields
        unitPlural="כניסות"
        unitSingular="כניסה"
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
          {loading ? "שומר..." : isEdit ? "עדכון הכניסה" : "שמירת הכניסה"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={inModal ? "md" : "lg"}
          disabled={loading}
          onClick={() =>
            onClose ? onClose() : router.push("/admin/tracks#pool-passes")
          }
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

/** @deprecated use PoolPassForm */
export const NewPoolPassForm = PoolPassForm;
