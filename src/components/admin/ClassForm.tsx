"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { uploadClassImage } from "@/lib/storage/classImage";
import {
  emptyScheduleState,
  ensureWeeklySessions,
  firstDuplicateSession,
  firstDuplicateWeeklySlot,
  formatWeeklySlotLabel,
  genderPolicyFromWeeklySlots,
  parseSessionCount,
  primaryInstructorId,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";
import { saveClassSchedule } from "@/lib/scheduling/saveClassSchedule";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { ClassCategoryField } from "@/components/admin/ClassCategoryField";
import { ClassImageUpload } from "@/components/admin/ClassImageUpload";
import { ClassPreviewPanel } from "@/components/admin/ClassPreview";
import { ClassScheduleEditor } from "@/components/admin/ClassScheduleEditor";
import { InstructorSelect } from "@/components/admin/InstructorSelect";
import {
  DEFAULT_CLASS_INSTALLMENTS,
  classPeriodTotal,
  parseBillingMonths,
} from "@/lib/finance/classPricing";
import {
  monthsToFormBound,
  parseAgeBoundInput,
  type AgeUnit,
} from "@/lib/age-range";
import {
  CLASS_GENDER_POLICY,
  type ClassAudienceType,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { SCHOOL_GRADES, parseSchoolGradeInput } from "@/lib/school-grade";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import type { Json } from "@/types/database.types";
import {
  defaultClassCategory,
  matchCategoryName,
  sortCategoryNames,
} from "@/lib/admin/classCategories";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import type { ClassBookingMode } from "@/lib/classes/bookingMode";

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
  capacity: number | null;
  price: number;
  billing_months: number | null;
  pick_one_slot: boolean;
  booking_mode?: ClassBookingMode;
  planned_session_count?: number | null;
  instructor_id: string | null;
  status: "active" | "inactive" | "full";
  image_url: string | null;
  schedule_type?: "weekly" | "custom";
  sibling_discount_tiers?: Json | null;
  interest_only?: boolean;
};

interface Props {
  instructors: ClassInstructorOption[];
  existing?: ClassFormData;
  initialSchedule?: ClassScheduleState;
  /** מילוי מחוג קיים, אבל השמירה יוצרת חוג חדש. */
  duplicate?: boolean;
  categories: string[];
}

const PAID_STEPS = [
  { id: "details", label: "פרטי החוג" },
  { id: "audience", label: "למי מיועד" },
  { id: "schedule", label: "מועדים" },
  { id: "pricing", label: "מחיר" },
] as const;

const INTEREST_STEPS = [
  { id: "details", label: "פרטי החוג" },
  { id: "audience", label: "למי מיועד" },
] as const;

const emptyForm = {
  title: "",
  description: "",
  category: "",
  level: "",
  gender_policy: "mixed" as ClassGenderPolicy,
  audience_type: "age" as ClassAudienceType,
  age_min: "",
  age_max: "",
  age_min_unit: "years" as AgeUnit,
  age_max_unit: "years" as AgeUnit,
  grade_min: "",
  grade_max: "",
  capacity: "10",
  capacity_limited: true,
  price: "",
  planned_session_count: "",
  pick_one_slot: true,
  booking_mode: "series" as ClassBookingMode,
  price_mode: "period" as const,
  billing_months: "10",
  instructor_id: "",
  image_url: "",
  interest_only: false,
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
    age_min: monthsToFormBound(existing.age_min).value,
    age_max: monthsToFormBound(existing.age_max).value,
    age_min_unit: monthsToFormBound(existing.age_min).unit,
    age_max_unit: monthsToFormBound(existing.age_max).unit,
    grade_min: existing.grade_min?.toString() ?? "",
    grade_max: existing.grade_max?.toString() ?? "",
    capacity: existing.capacity != null ? existing.capacity.toString() : "10",
    capacity_limited: existing.capacity != null,
    price: existing.price ? existing.price.toString() : "",
    planned_session_count:
      existing.planned_session_count != null
        ? String(existing.planned_session_count)
        : "",
    pick_one_slot: existing.pick_one_slot ?? true,
    booking_mode: existing.booking_mode ?? "series",
    price_mode: parseBillingMonths(existing.billing_months)
      ? ("monthly" as const)
      : ("period" as const),
    billing_months: String(parseBillingMonths(existing.billing_months) ?? 10),
    instructor_id: existing.instructor_id ?? "",
    image_url: existing.image_url ?? "",
    interest_only: existing.interest_only ?? false,
  };
}

function toPayload(
  form: ReturnType<typeof toFormState>,
  imageUrl: string | null,
  schedule: ClassScheduleState,
  status: ClassFormData["status"]
) {
  const audienceType = form.audience_type;
  const isGrade = audienceType === "grade";
  const isOpen = audienceType === "open";
  const weeklyGender =
    !form.interest_only &&
    schedule.scheduleType === "weekly" &&
    schedule.weeklySlots.length > 0
      ? genderPolicyFromWeeklySlots(schedule.weeklySlots)
      : form.gender_policy;

  return {
    sibling_discount_tiers: null,
    title: form.title,
    description: form.description || null,
    category: form.category || null,
    level: form.level || null,
    gender_policy: weeklyGender,
    audience_type: audienceType,
    age_min: isGrade || isOpen
      ? null
      : parseAgeBoundInput(form.age_min, form.age_min_unit),
    age_max: isGrade || isOpen
      ? null
      : parseAgeBoundInput(form.age_max, form.age_max_unit),
    grade_min: isGrade ? parseSchoolGradeInput(form.grade_min) : null,
    grade_max: isGrade ? parseSchoolGradeInput(form.grade_max) : null,
    capacity:
      form.booking_mode === "appointment"
        ? 1
        : form.capacity_limited
          ? Number(form.capacity) || 0
          : null,
    price: Number(form.price) || 0,
    billing_months:
      form.interest_only || form.booking_mode === "appointment"
        ? null
        : form.price_mode === "monthly"
          ? parseBillingMonths(Number(form.billing_months))
          : null,
    booking_mode: form.interest_only ? "series" : form.booking_mode,
    planned_session_count: form.interest_only
      ? parseSessionCount(form.planned_session_count)
      : null,
    instructor_id: primaryInstructorId(schedule, form.instructor_id),
    pick_one_slot:
      form.interest_only || form.booking_mode === "appointment"
        ? false
        : form.pick_one_slot,
    status,
    image_url: imageUrl,
    schedule_type: schedule.scheduleType,
    interest_only: form.interest_only,
  };
}

function formatClassSaveError(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`;
  if (text.includes("classes_audience_fields")) {
    return "לא ניתן לשמור את הגדרת קהל היעד. בדקו גילאים, כיתות, או «פתוח לכולם».";
  }
  return "אירעה שגיאה בשמירת החוג. בדקו את הפרטים ונסו שוב.";
}

function validateAudience(
  form: ReturnType<typeof toFormState>,
  schedule: ClassScheduleState
): string | null {
  if (
    (form.interest_only || schedule.scheduleType !== "weekly") &&
    !form.gender_policy
  ) {
    return "נא לבחור למי מיועד החוג.";
  }

  if (form.audience_type === "open") {
    return null;
  }

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

  const min = parseAgeBoundInput(form.age_min, form.age_min_unit);
  const max = parseAgeBoundInput(form.age_max, form.age_max_unit);
  if (min !== null && max !== null && min > max) {
    return "גיל המינימום לא יכול להיות גבוה מגיל המקסימום.";
  }
  return null;
}

function validateDetails(form: ReturnType<typeof toFormState>): string | null {
  if (!form.title.trim()) return "נא למלא את שם החוג.";
  if (form.interest_only) {
    if (form.price !== "" && Number(form.price) < 0) {
      return "המחיר המתוכנן לא יכול להיות שלילי.";
    }
    if (
      form.planned_session_count.trim() &&
      !parseSessionCount(form.planned_session_count)
    ) {
      return "נא להזין כמות מפגשים תקינה, או להשאיר ריק.";
    }
  }
  return null;
}

function validatePricing(form: ReturnType<typeof toFormState>): string | null {
  if (form.price === "" || Number(form.price) < 0) {
    return "נא למלא את מחיר החוג.";
  }
  if (
    form.price_mode === "monthly" &&
    !parseBillingMonths(Number(form.billing_months))
  ) {
    return "נא לבחור בין 2 ל־12 חודשים לחוג שמתומחר לפי חודש.";
  }
  return null;
}

function validateCapacity(form: ReturnType<typeof toFormState>): string | null {
  if (form.booking_mode === "appointment") return null;
  if (!form.capacity_limited) return null;
  if (!Number(form.capacity) || Number(form.capacity) < 1) {
    return "נא למלא מכסת משתתפים.";
  }
  return null;
}

function validateSchedule(schedule: ClassScheduleState): string | null {
  const active = schedule.sessions.filter((s) => s.status !== "cancelled");

  if (schedule.scheduleType === "weekly") {
    const validSlots = schedule.weeklySlots.filter(
      (slot) => slot.startTime.trim() && slot.endTime.trim()
    );
    if (validSlots.length === 0) {
      return "הוסיפו לפחות מועד אחד עם שעות.";
    }
    const duplicateSlot = firstDuplicateWeeklySlot(validSlots);
    if (duplicateSlot) {
      return `אי אפשר לשמור שני מועדים באותו יום ובאותה שעת התחלה (${formatWeeklySlotLabel(
        duplicateSlot.dayOfWeek,
        duplicateSlot.startTime,
        duplicateSlot.endTime
      )}). שנו את שעת ההתחלה או מחקו את הכפיל.`;
    }
    if (!schedule.rangeStart) {
      return "הזינו תאריך התחלה ללוח הזמנים.";
    }
    if (
      active.length === 0 &&
      !parseSessionCount(schedule.sessionCount) &&
      !schedule.rangeEnd
    ) {
      return "הזינו מספר מפגשים או תאריך סיום.";
    }
  }

  if (active.length === 0) {
    return schedule.scheduleType === "custom"
      ? "הוסיפו לפחות מפגש אחד."
      : "הזינו תאריך התחלה ומספר מפגשים.";
  }

  for (const session of active) {
    if (!session.sessionDate || !session.startTime || !session.endTime) {
      return "מלאו תאריך ושעות לכל המפגשים.";
    }
  }

  const duplicateSession = firstDuplicateSession(active);
  if (duplicateSession) {
    return `אי אפשר לשמור שני מפגשים באותו תאריך ובאותה שעת התחלה (${duplicateSession.sessionDate} ${duplicateSession.startTime.slice(0, 5)}).`;
  }

  return null;
}

export function ClassForm({
  instructors,
  existing,
  initialSchedule,
  duplicate = false,
  categories,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(existing) && !duplicate;
  const [categoryNames, setCategoryNames] = useState(categories);
  const [form, setForm] = useState(() => toFormState(existing, categories));
  const [schedule, setSchedule] = useState(
    () => initialSchedule ?? emptyScheduleState()
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const formSteps = form.interest_only ? INTEREST_STEPS : PAID_STEPS;
  const lastStep = formSteps.length - 1;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const previewImageUrl = imagePreviewUrl || form.image_url.trim() || null;

  const selectedInstructor = useMemo(
    () =>
      instructors.find(
        (i) => i.id === primaryInstructorId(schedule, form.instructor_id)
      ) ?? null,
    [form.instructor_id, instructors, schedule]
  );
  const instructorName = selectedInstructor?.full_name ?? null;

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function setAudienceType(audienceType: ClassAudienceType) {
    setForm((f) => ({
      ...f,
      audience_type: audienceType,
      ...(audienceType === "open"
        ? {
            age_min: "",
            age_max: "",
            age_min_unit: "years" as AgeUnit,
            age_max_unit: "years" as AgeUnit,
            grade_min: "",
            grade_max: "",
          }
        : {}),
    }));
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

  function validateStep(
    index: number,
    nextSchedule = schedule
  ): string | null {
    if (index === 0) return validateDetails(form);
    if (index === 1) {
      return validateAudience(form, nextSchedule) ?? validateCapacity(form);
    }
    if (form.interest_only) return null;
    if (index === 2) return validateSchedule(nextSchedule);
    return validatePricing(form);
  }

  function goTo(index: number) {
    if (index < step) {
      setError(null);
      setStep(index);
    }
  }

  function goNext() {
    const nextSchedule = ensureWeeklySessions(schedule);
    if (nextSchedule !== schedule) setSchedule(nextSchedule);
    const stepError = validateStep(step, nextSchedule);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, lastStep));
  }

  async function saveClass() {
    setError(null);

    const nextSchedule = ensureWeeklySessions(schedule);
    if (nextSchedule !== schedule) {
      setSchedule(nextSchedule);
    }

    for (let index = 0; index <= lastStep; index += 1) {
      const stepError = validateStep(index, nextSchedule);
      if (stepError) {
        setError(stepError);
        setStep(index);
        return;
      }
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

    const nextStatus = isEdit
      ? !form.capacity_limited && existing?.status === "full"
        ? "active"
        : existing?.status ?? "active"
      : "active";
    const payload = toPayload(
      form,
      imageUrl,
      nextSchedule,
      nextStatus
    );

    let classId = existing?.id;

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("classes")
        .update(payload)
        .eq("id", existing!.id);

      if (updateError) {
        setError(formatClassSaveError(updateError));
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
        setError(formatClassSaveError(insertError));
        setLoading(false);
        return;
      }

      classId = inserted.id;
    }

    if (!form.interest_only) {
      const scheduleSave = await saveClassSchedule(
        supabase,
        classId!,
        nextSchedule
      );
      if (scheduleSave.error) {
        setError(scheduleSave.error);
        setLoading(false);
        return;
      }
    }

    await revalidatePublicCatalog();
    router.push("/admin/classes");
    router.refresh();
  }

  return (
    <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step < lastStep) goNext();
          else void saveClass();
        }}
        className="min-w-0 space-y-6"
      >
        <ClassFormStepper
          steps={formSteps}
          current={step}
          onSelect={goTo}
        />

        <Card className={step === 0 ? undefined : "hidden"}>
          <CardContent className="space-y-5">
            <StepIntro
              title="פרטי החוג"
              hint="שם, קטגוריה ותיאור קצר — אפשר להוסיף תמונה עכשיו או אחר כך."
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <AudienceModeOption
                selected={!form.interest_only && form.booking_mode !== "appointment"}
                onSelect={() => {
                  setForm((f) => ({
                    ...f,
                    interest_only: false,
                    booking_mode: "series",
                    pick_one_slot: true,
                  }));
                  setError(null);
                }}
                title="חוג רגיל"
                hint="עם מועדים, מחיר והרשמה לתקופה"
                disabled={loading}
              />
              <AudienceModeOption
                selected={!form.interest_only && form.booking_mode === "appointment"}
                onSelect={() => {
                  setForm((f) => ({
                    ...f,
                    interest_only: false,
                    booking_mode: "appointment",
                    pick_one_slot: false,
                    price_mode: "period",
                    capacity_limited: true,
                    capacity: "1",
                  }));
                  setError(null);
                }}
                title="תורים לטיפול"
                hint="כל משבצת לאדם אחד — רוכשים טיפול בודד, לא את כל הסדרה"
                disabled={loading}
              />
              <AudienceModeOption
                selected={form.interest_only}
                onSelect={() => {
                  setForm((f) => ({
                    ...f,
                    interest_only: true,
                    booking_mode: "series",
                  }));
                  setStep((current) => Math.min(current, 1));
                  setError(null);
                }}
                title="הרשמת עניין"
                hint="בלי תאריך ובלי חיוב עכשיו — אפשר לציין מחיר ומפגשים מתוכננים"
                disabled={loading}
              />
            </div>
            {form.interest_only && (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                הלקוחות נרשמים בחינם. מחיר וכמות מפגשים מוצגים מראש, בלי תאריך
                ובלי חיוב. אחרי שיהיה מספיק עניין אפשר לפתוח את החוג.
              </p>
            )}
            <Field label="שם החוג" required>
              <Input
                value={form.title}
                onChange={set("title")}
                placeholder="למשל: שחייה למתחילים"
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
            {form.interest_only && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="מחיר מתוכנן (₪)"
                  hint="מוצג לנרשמים. אין חיוב בהרשמת עניין."
                >
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={form.price}
                    onChange={set("price")}
                    placeholder="למשל: 450"
                  />
                </Field>
                <Field
                  label="כמות מפגשים"
                  hint="בלי תאריכים — רק כמה מפגשים מתוכננים."
                >
                  <Input
                    type="number"
                    min={1}
                    max={80}
                    step="1"
                    value={form.planned_session_count}
                    onChange={set("planned_session_count")}
                    placeholder="למשל: 10"
                  />
                </Field>
              </div>
            )}
            <ClassImageUpload
              displayUrl={previewImageUrl}
              onFileSelect={handleImageSelect}
              onClear={handleImageClear}
              onValidationError={setError}
              disabled={loading}
            />
          </CardContent>
        </Card>

        <Card className={step === 1 ? undefined : "hidden"}>
          <CardContent className="space-y-5">
            <StepIntro
              title="למי מיועד החוג"
              hint={
                form.interest_only
                  ? "בחרו מגדר, מכסה, וגילאים או כיתות. אין מועדים בשלב הזה."
                  : schedule.scheduleType === "weekly"
                    ? "בחרו גילאים או כיתות. מגדר נקבע אחר כך לכל מועד."
                    : "בחרו מגדר, ואז גילאים, כיתות, או חוג פתוח לכולם."
              }
            />

            {(form.interest_only || schedule.scheduleType !== "weekly") && (
              <Field label="מגדר" required>
                <Select
                  value={form.gender_policy}
                  onChange={set("gender_policy")}
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
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <AudienceModeOption
                selected={form.audience_type === "age"}
                onSelect={() => setAudienceType("age")}
                title="לפי גיל"
                hint="שנים או חודשים"
                disabled={loading}
              />
              <AudienceModeOption
                selected={form.audience_type === "grade"}
                onSelect={() => setAudienceType("grade")}
                title="לפי כיתה"
                hint="מכיתה ועד כיתה"
                disabled={loading}
              />
              <AudienceModeOption
                selected={form.audience_type === "open"}
                onSelect={() => setAudienceType("open")}
                title="פתוח לכולם"
                hint="בלי הגבלת גיל או כיתה"
                disabled={loading}
              />
            </div>

            {form.audience_type === "age" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AgeBoundField
                    label="גיל מינימום"
                    value={form.age_min}
                    unit={form.age_min_unit}
                    onValueChange={set("age_min")}
                    onUnitChange={(unit) =>
                      setForm((f) => ({ ...f, age_min_unit: unit }))
                    }
                    placeholder="2"
                    disabled={loading}
                  />
                  <AgeBoundField
                    label="גיל מקסימום"
                    value={form.age_max}
                    unit={form.age_max_unit}
                    onValueChange={set("age_max")}
                    onUnitChange={(unit) =>
                      setForm((f) => ({ ...f, age_max_unit: unit }))
                    }
                    placeholder="3"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-ink-500">
                  לחוג פעוטות אפשר למשל מינימום 2 חודשים ומקסימום 3 שנים.
                </p>
              </div>
            ) : form.audience_type === "grade" ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <Field label="מכיתה" required>
                  <Select
                    value={form.grade_min}
                    onChange={set("grade_min")}
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
            ) : null}

            {form.booking_mode !== "appointment" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-800">
                מכסת משתתפים
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <AudienceModeOption
                  selected={form.capacity_limited}
                  onSelect={() =>
                    setForm((f) => ({ ...f, capacity_limited: true }))
                  }
                  title="יש הגבלה"
                  hint="ההרשמה נסגרת כשמגיעים למכסה"
                  disabled={loading}
                />
                <AudienceModeOption
                  selected={!form.capacity_limited}
                  onSelect={() =>
                    setForm((f) => ({ ...f, capacity_limited: false }))
                  }
                  title="אין הגבלה"
                  hint="אפשר להירשם בלי תקרת משתתפים"
                  disabled={loading}
                />
              </div>
              {form.capacity_limited && (
                <Field label="כמה משתתפים" required>
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={set("capacity")}
                    placeholder="למשל: 10"
                  />
                </Field>
              )}
            </div>
            )}
            {form.booking_mode === "appointment" && (
              <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
                בכל משבצת זמן יכול לקבוע אדם אחד בלבד — כמו תור לטיפול.
              </p>
            )}
            {form.interest_only && (
              <Field label="מדריך או מדריכה">
                <InstructorSelect
                  value={form.instructor_id}
                  onChange={(instructorId) =>
                    setForm((f) => ({ ...f, instructor_id: instructorId }))
                  }
                  instructors={instructors}
                  disabled={loading}
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card className={step === 2 && !form.interest_only ? undefined : "hidden"}>
          <CardContent className="space-y-5">
            <StepIntro
              title="מועדים"
              hint={
                form.booking_mode === "appointment"
                  ? "תאריך התחלה וסיום, ומשבצות זמן (למשל 11:00–11:30). כל משבצת היא תור לאדם אחד."
                  : "יום, שעה ומדריך לכל מועד, מתי מתחילים וכמה מפגשים."
              }
            />
            <ClassScheduleEditor
              value={schedule}
              onChange={setSchedule}
              disabled={loading}
              pickOneSlot={form.pick_one_slot}
              onPickOneSlotChange={
                form.booking_mode === "appointment"
                  ? undefined
                  : (pickOneSlot) =>
                      setForm((f) => ({ ...f, pick_one_slot: pickOneSlot }))
              }
              instructors={instructors}
            />
            {schedule.scheduleType === "custom" && (
              <Field label="מדריך או מדריכה">
                <InstructorSelect
                  value={form.instructor_id}
                  onChange={(instructorId) =>
                    setForm((f) => ({ ...f, instructor_id: instructorId }))
                  }
                  instructors={instructors}
                  disabled={loading}
                />
              </Field>
            )}
          </CardContent>
        </Card>

        <Card className={step === 3 && !form.interest_only ? undefined : "hidden"}>
          <CardContent className="space-y-5">
            <StepIntro
              title="מחיר והנחות"
              hint={
                form.booking_mode === "appointment"
                  ? "מחיר לטיפול אחד. הלקוח משלם לפי מספר המשבצות שבחר."
                  : "מחיר אחד לכל התקופה, או מחיר חודשי. הלקוח יכול לפרוס בתשלומים."
              }
            />

            {form.booking_mode !== "appointment" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <AudienceModeOption
                selected={form.price_mode === "period"}
                onSelect={() =>
                  setForm((f) => ({ ...f, price_mode: "period" }))
                }
                title="סכום לתקופה"
                hint="מחיר אחד לכל החוג"
                disabled={loading}
              />
              <AudienceModeOption
                selected={form.price_mode === "monthly"}
                onSelect={() =>
                  setForm((f) => ({ ...f, price_mode: "monthly" }))
                }
                title="לפי חודש"
                hint="מחיר חודשי × מספר חודשים"
                disabled={loading}
              />
            </div>
            )}

            <div
              className={
                form.price_mode === "monthly"
                  ? "grid gap-5 sm:grid-cols-2"
                  : undefined
              }
            >
              <Field
                label={
                  form.booking_mode === "appointment"
                    ? "מחיר לטיפול (₪)"
                    : form.price_mode === "monthly"
                      ? "מחיר לחודש (₪)"
                      : "מחיר לתקופה (₪)"
                }
                required
              >
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.price}
                  onChange={set("price")}
                  placeholder={form.price_mode === "monthly" ? "למשל: 160" : "למשל: 320"}
                />
              </Field>
              {form.price_mode === "monthly" && (
                <Field label="מספר חודשים" required>
                  <Input
                    type="number"
                    min={2}
                    max={12}
                    step="1"
                    value={form.billing_months}
                    onChange={set("billing_months")}
                  />
                </Field>
              )}
            </div>
            {form.price_mode === "monthly" && Number(form.price) > 0 && (
              <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
                סה״כ לתקופה:{" "}
                <span className="font-semibold text-ink-900">
                  {formatCurrency(
                    classPeriodTotal(
                      Number(form.price),
                      Number(form.billing_months)
                    )
                  )}
                </span>
                {" · "}
                הלקוח ישלם את מלוא הסכום, עם אפשרות לפרוס עד{" "}
                {parseBillingMonths(Number(form.billing_months)) ?? "—"} תשלומים
                בקארדקום.
              </p>
            )}
            {form.price_mode === "period" && Number(form.price) > 0 && (
              <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
                הלקוח ישלם את מלוא הסכום, עם אפשרות לפרוס עד{" "}
                {DEFAULT_CLASS_INSTALLMENTS} תשלומים בקארדקום.
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={loading}
              onClick={() => {
                setError(null);
                setStep((current) => current - 1);
              }}
            >
              חזרה
            </Button>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading
              ? "שומר..."
              : step < lastStep
                ? "המשך"
                : isEdit
                  ? "עדכון החוג"
                  : "שמירת החוג"}
          </Button>
          <Button
            type="button"
            variant="ghost"
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
        instructorGender={selectedInstructor?.gender ?? null}
        previewStatus={existing?.status ?? "active"}
      />
    </div>
  );
}

function StepIntro({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-0.5 text-sm text-ink-500">{hint}</p>
    </div>
  );
}

function ClassFormStepper({
  steps,
  current,
  onSelect,
}: {
  steps: readonly { id: string; label: string }[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-500 sm:hidden">
        שלב {current + 1} מתוך {steps.length} · {steps[current]?.label}
      </p>
      <ol className="flex list-none items-center gap-2 p-0">
        {steps.map((item, index) => {
          const done = current > index;
          const active = current === index;
          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={index >= current}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                  done
                    ? "bg-aqua-500 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-ink-100 text-ink-500",
                  index < current && "hover:brightness-95"
                )}
                aria-current={active ? "step" : undefined}
                aria-label={item.label}
              >
                {done ? <Icon name="check" size={14} stroke={3} /> : index + 1}
              </button>
              <span
                className={cn(
                  "hidden truncate text-[13px] font-semibold sm:block",
                  active ? "text-ink-900" : "text-ink-400"
                )}
              >
                {item.label}
              </span>
              {index < steps.length - 1 && (
                <span className="h-px min-w-3 flex-1 bg-ink-100" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AgeBoundField({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  unit: AgeUnit;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUnitChange: (unit: AgeUnit) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} className="min-w-0">
      <div
        className={cn(
          "flex min-w-0 overflow-hidden rounded-xl border border-ink-200 bg-white",
          "focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200",
          disabled && "bg-ink-50"
        )}
      >
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-ink-900 outline-none placeholder:text-ink-400",
            "disabled:text-ink-400",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          )}
        />
        <div className="relative w-[7.5rem] shrink-0 border-s border-ink-200 bg-ink-50/80">
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as AgeUnit)}
            disabled={disabled}
            aria-label={`${label} — יחידת מידה`}
            className="h-11 w-full cursor-pointer appearance-none bg-transparent pe-8 ps-3 text-sm text-ink-800 outline-none disabled:text-ink-400"
          >
            <option value="years">שנים</option>
            <option value="months">חודשים</option>
          </select>
          <Icon
            name="chevron"
            size={16}
            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 -rotate-90 text-ink-400"
          />
        </div>
      </div>
    </Field>
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

/** @deprecated use ClassForm */
export const NewClassForm = ClassForm;
