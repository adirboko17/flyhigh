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
import { ClassCategoryField } from "@/components/admin/ClassCategoryField";
import { ClassImageUpload } from "@/components/admin/ClassImageUpload";
import { ClassPreviewPanel } from "@/components/admin/ClassPreview";
import { ClassScheduleEditor } from "@/components/admin/ClassScheduleEditor";
import {
  SiblingDiscountEditor,
  SiblingDiscountSummary,
} from "@/components/admin/SiblingDiscountEditor";
import {
  parseSiblingTiers,
  serializeSiblingTiers,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import {
  CLASS_GENDER_POLICY,
  type ClassAudienceType,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { SCHOOL_GRADES, parseSchoolGradeInput } from "@/lib/school-grade";
import { cn } from "@/utils/cn";
import type { Json } from "@/types/database.types";
import {
  defaultClassCategory,
  matchCategoryName,
  sortCategoryNames,
} from "@/lib/admin/classCategories";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";

export type ClassFormData = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  gender_policy: ClassGenderPolicy;
  audience_type: ClassAudienceType;
  age_min: number | null;
  age_max: number | null;
  grade_min: number | null;
  grade_max: number | null;
  capacity: number;
  price: number;
  instructor_id: string | null;
  status: "active" | "inactive" | "full";
  image_url: string | null;
  schedule_type?: "weekly" | "custom";
  sibling_discount_tiers?: Json | null;
};

interface Props {
  instructors: ClassInstructorOption[];
  existing?: ClassFormData;
  initialSchedule?: ClassScheduleState;
  /** מדרגות ברירת המחדל של המערכת, מוצגות כשהחוג לא מגדיר מדרגות משלו. */
  defaultSiblingTiers: SiblingDiscountTier[];
  categories: string[];
}

const emptyForm = {
  title: "",
  description: "",
  category: "",
  level: "",
  gender_policy: "mixed" as ClassGenderPolicy,
  audience_type: "age" as ClassAudienceType,
  age_min: "",
  age_max: "",
  grade_min: "",
  grade_max: "",
  capacity: "10",
  price: "",
  instructor_id: "",
  image_url: "",
};

function toFormState(existing?: ClassFormData, categories: string[] = []) {
  if (!existing) {
    return {
      ...emptyForm,
      category: defaultClassCategory(null, categories),
    };
  }
  return {
    title: existing.title,
    description: existing.description ?? "",
    category: defaultClassCategory(existing.category, categories),
    level: existing.level ?? "",
    gender_policy: existing.gender_policy ?? "mixed",
    audience_type: existing.audience_type ?? "age",
    age_min: existing.age_min?.toString() ?? "",
    age_max: existing.age_max?.toString() ?? "",
    grade_min: existing.grade_min?.toString() ?? "",
    grade_max: existing.grade_max?.toString() ?? "",
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
  status: ClassFormData["status"],
  siblingDiscountTiers: Json | null
) {
  const audienceType = form.audience_type;
  const isGrade = audienceType === "grade";

  return {
    sibling_discount_tiers: siblingDiscountTiers,
    title: form.title,
    description: form.description || null,
    category: form.category || null,
    level: form.level || null,
    gender_policy: form.gender_policy,
    audience_type: audienceType,
    age_min: isGrade ? null : form.age_min ? Number(form.age_min) : null,
    age_max: isGrade ? null : form.age_max ? Number(form.age_max) : null,
    grade_min: isGrade ? parseSchoolGradeInput(form.grade_min) : null,
    grade_max: isGrade ? parseSchoolGradeInput(form.grade_max) : null,
    capacity: Number(form.capacity) || 0,
    price: Number(form.price) || 0,
    instructor_id: form.instructor_id || null,
    status,
    image_url: imageUrl,
    schedule_type: scheduleType,
  };
}

function validateAudience(form: ReturnType<typeof toFormState>): string | null {
  if (!form.gender_policy) return "נא לבחור למי מיועד החוג.";

  if (form.audience_type === "grade") {
    const min = parseSchoolGradeInput(form.grade_min);
    const max = parseSchoolGradeInput(form.grade_max);
    if (min === null || max === null) {
      return "נא לבחור כיתה מינימום וכיתה מקסימום.";
    }
    if (min > max) {
      return "כיתת המינימום לא יכולה להיות גבוהה מכיתת המקסימום.";
    }
    return null;
  }

  const min = form.age_min ? Number(form.age_min) : null;
  const max = form.age_max ? Number(form.age_max) : null;
  if (min !== null && max !== null && min > max) {
    return "גיל המינימום לא יכול להיות גבוה מגיל המקסימום.";
  }
  return null;
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

export function ClassForm({
  instructors,
  existing,
  initialSchedule,
  defaultSiblingTiers,
  categories,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [categoryNames, setCategoryNames] = useState(categories);
  const [form, setForm] = useState(() => toFormState(existing, categories));
  const [schedule, setSchedule] = useState(
    () => initialSchedule ?? emptyScheduleState()
  );
  const [usesDefaultDiscount, setUsesDefaultDiscount] = useState(
    () => !Array.isArray(existing?.sibling_discount_tiers)
  );
  const [siblingTiers, setSiblingTiers] = useState<SiblingDiscountTier[]>(() =>
    Array.isArray(existing?.sibling_discount_tiers)
      ? parseSiblingTiers(existing.sibling_discount_tiers)
      : defaultSiblingTiers
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

  function setAudienceType(audienceType: ClassAudienceType) {
    setForm((f) => ({ ...f, audience_type: audienceType }));
  }

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

    const audienceError = validateAudience(form);
    if (audienceError) {
      setError(audienceError);
      return;
    }

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
      existing?.status ?? "active",
      usesDefaultDiscount ? null : serializeSiblingTiers(siblingTiers)
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
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <form onSubmit={submit} className="min-w-0 space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <Field label="שם החוג" required>
              <Input
                value={form.title}
                onChange={set("title")}
                placeholder="למשל: שחייה למתחילים"
                required
              />
            </Field>
            <Field label="תיאור">
              <Textarea
                value={form.description}
                onChange={set("description")}
                placeholder="כתבו תיאור קצר על החוג"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <ClassCategoryField
                value={form.category}
                categories={categoryNames}
                onChange={(name) => setForm((f) => ({ ...f, category: name }))}
                onCategoryAdded={(name) =>
                  setCategoryNames((prev) =>
                    matchCategoryName(prev, name)
                      ? prev
                      : sortCategoryNames([...prev, name])
                  )
                }
                disabled={loading}
              />
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
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">
                למי מיועד החוג
              </h3>
              <p className="mt-0.5 text-sm text-ink-500">
                הגדירו מגדר וטווח גילאים או כיתות להרשמה.
              </p>
            </div>

            <Field label="מגדר" required>
              <Select
                value={form.gender_policy}
                onChange={set("gender_policy")}
                required
              >
                {(Object.keys(CLASS_GENDER_POLICY) as ClassGenderPolicy[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {CLASS_GENDER_POLICY[value]}
                    </option>
                  )
                )}
              </Select>
            </Field>

            <div className="grid gap-2 sm:grid-cols-2">
              <AudienceModeOption
                selected={form.audience_type === "age"}
                onSelect={() => setAudienceType("age")}
                title="לפי גיל"
                hint="גיל מינימום ומקסימום"
                disabled={loading}
              />
              <AudienceModeOption
                selected={form.audience_type === "grade"}
                onSelect={() => setAudienceType("grade")}
                title="לפי כיתה"
                hint="מכיתה ועד כיתה"
                disabled={loading}
              />
            </div>

            {form.audience_type === "age" ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <Field label="גיל מינימום">
                  <Input
                    type="number"
                    min={0}
                    value={form.age_min}
                    onChange={set("age_min")}
                    placeholder="למשל: 4"
                  />
                </Field>
                <Field label="גיל מקסימום">
                  <Input
                    type="number"
                    min={0}
                    value={form.age_max}
                    onChange={set("age_max")}
                    placeholder="למשל: 8"
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <Field label="מכיתה" required>
                  <Select
                    value={form.grade_min}
                    onChange={set("grade_min")}
                    required
                  >
                    <option value="">בחרו...</option>
                    {SCHOOL_GRADES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="עד כיתה" required>
                  <Select
                    value={form.grade_max}
                    onChange={set("grade_max")}
                    required
                  >
                    <option value="">בחרו...</option>
                    {SCHOOL_GRADES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="מכסת משתתפים" required>
                <Input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={set("capacity")}
                  placeholder="למשל: 10"
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
                  placeholder="למשל: 320"
                  required
                />
              </Field>
            </div>
            <Field label="מדריכה">
              <Select value={form.instructor_id} onChange={set("instructor_id")}>
                <option value="">ללא שיוך</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.isSelf ? `${i.full_name} (אני · מנהל)` : i.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-ink-900">
                הנחת אחים
              </h3>
              <p className="mt-0.5 text-sm text-ink-500">
                כשמשפחה רושמת כמה ילדים לאותה קטגוריה — גם בחוגים שונים, למשל
                שני חוגי שחייה — ההנחה חלה רק על הילד השני ומעלה. בקטגוריה
                אחרת אין הנחת אחים.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <DiscountModeOption
                selected={usesDefaultDiscount}
                onSelect={() => {
                  setUsesDefaultDiscount(true);
                  setSiblingTiers(defaultSiblingTiers);
                }}
                title="ברירת המחדל של המערכת"
                hint="מתעדכן אוטומטית אם תשנו את ההגדרה הכללית"
                disabled={loading}
              />
              <DiscountModeOption
                selected={!usesDefaultDiscount}
                onSelect={() => setUsesDefaultDiscount(false)}
                title="הגדרה מיוחדת לחוג זה"
                hint="מדרגות משלכם, בלי קשר להגדרה הכללית"
                disabled={loading}
              />
            </div>

            {usesDefaultDiscount ? (
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <SiblingDiscountSummary tiers={defaultSiblingTiers} />
              </div>
            ) : (
              <SiblingDiscountEditor
                tiers={siblingTiers}
                onChange={setSiblingTiers}
                disabled={loading}
              />
            )}
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

        <div className="flex flex-col gap-3 sm:flex-row">
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

function AudienceModeOption({
  selected,
  onSelect,
  title,
  hint,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border px-4 py-3 text-start transition-colors disabled:opacity-60",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-ink-200 bg-white hover:border-ink-300"
      )}
    >
      <span
        className={cn(
          "block text-sm font-semibold",
          selected ? "text-brand-800" : "text-ink-800"
        )}
      >
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
    </button>
  );
}

function DiscountModeOption({
  selected,
  onSelect,
  title,
  hint,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border px-4 py-3 text-start transition-colors disabled:opacity-60",
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-ink-200 bg-white hover:border-ink-300"
      )}
    >
      <span
        className={cn(
          "block text-sm font-semibold",
          selected ? "text-brand-800" : "text-ink-800"
        )}
      >
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
    </button>
  );
}

/** @deprecated use ClassForm */
export const NewClassForm = ClassForm;
