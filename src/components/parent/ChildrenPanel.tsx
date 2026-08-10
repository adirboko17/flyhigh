"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Badge } from "@/components/ui/Badge";
import { BirthDateInput } from "@/components/ui/BirthDateInput";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { GENDER } from "@/lib/constants";
import {
  currentSchoolYear,
  formatSchoolGrade,
  parseSchoolGradeInput,
  resolveSchoolGrade,
  SCHOOL_GRADES,
} from "@/lib/school-grade";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database.types";
import { calcAge, formatDate, initials } from "@/utils/format";

export type ParentChild = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: Enums<"gender_type"> | null;
  school_grade: number | null;
  grade_school_year: number | null;
  notes: string | null;
  /** שמות הפעילויות הפעילות של הילד/ה. */
  activities: string[];
  /** הרשמות ורשימות המתנה שמונעות מחיקה בטוחה. */
  linkedRecords: number;
  canDelete: boolean;
};

/** כמה ילדים להציג בכרטיס עצמו לפני שעוברים ל"צפה בהכל". */
const PREVIEW_LIMIT = 3;

const EMPTY_FORM = { name: "", birth: "", gender: "", grade: "", notes: "" };

export function ChildrenPanel({
  parentId,
  kids,
  personalActivities,
  parentName,
}: {
  parentId: string;
  kids: ParentChild[];
  /** פעילויות שנרשמו על שם ההורה עצמו, ללא ילד/ה. */
  personalActivities: string[];
  parentName: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ParentChild | null>(null);
  const [removingChild, setRemovingChild] = useState<ParentChild | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function closeAdd() {
    setAddOpen(false);
    setError(null);
    setForm(EMPTY_FORM);
  }

  function openEdit(child: ParentChild) {
    setEditingChild(child);
    setError(null);
    const currentGrade = resolveSchoolGrade(
      child.school_grade,
      child.grade_school_year,
    );
    setForm({
      name: child.full_name,
      birth: child.birth_date ?? "",
      gender: child.gender ?? "",
      grade: currentGrade == null ? "" : String(currentGrade),
      notes: child.notes ?? "",
    });
  }

  function closeEdit() {
    setEditingChild(null);
    setError(null);
    setForm(EMPTY_FORM);
  }

  function closeRemove() {
    setRemovingChild(null);
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const schoolGrade = parseSchoolGradeInput(form.grade);
    if (schoolGrade === null) {
      setSaving(false);
      setError("נא לבחור כיתה.");
      return;
    }

    const { error: insertError } = await createClient().from("children").insert({
      parent_id: parentId,
      full_name: form.name.trim(),
      birth_date: form.birth || null,
      gender: (form.gender || null) as Enums<"gender_type"> | null,
      school_grade: schoolGrade,
      grade_school_year: currentSchoolYear(),
      notes: form.notes.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError("שמירת הפרטים נכשלה. נסו שוב בעוד רגע.");
      return;
    }

    closeAdd();
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChild) return;

    setSaving(true);
    setError(null);

    const schoolGrade = parseSchoolGradeInput(form.grade);
    if (schoolGrade === null) {
      setSaving(false);
      setError("נא לבחור כיתה.");
      return;
    }

    const { error: updateError } = await createClient()
      .from("children")
      .update({
        full_name: form.name.trim(),
        birth_date: form.birth || null,
        gender: (form.gender || null) as Enums<"gender_type"> | null,
        school_grade: schoolGrade,
        grade_school_year: currentSchoolYear(),
        notes: form.notes.trim() || null,
      })
      .eq("id", editingChild.id)
      .eq("parent_id", parentId)
      .select("id")
      .single();

    setSaving(false);

    if (updateError) {
      setError("עדכון הפרטים נכשל. נסו שוב בעוד רגע.");
      return;
    }

    closeEdit();
    router.refresh();
  }

  async function handleRemove() {
    if (!removingChild?.canDelete) return;

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const [{ count: enrollmentCount, error: enrollmentError }, {
      count: waitlistCount,
      error: waitlistError,
    }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("child_id", removingChild.id),
      supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .eq("child_id", removingChild.id),
    ]);

    if (
      enrollmentError ||
      waitlistError ||
      (enrollmentCount ?? 0) > 0 ||
      (waitlistCount ?? 0) > 0
    ) {
      setSaving(false);
      setError(
        enrollmentError || waitlistError
          ? "לא הצלחנו לוודא שניתן להסיר את הילד/ה. נסו שוב בעוד רגע."
          : "לא ניתן להסיר את הילד/ה כי קיימת הרשמה או רשימת המתנה."
      );
      return;
    }

    const { error: deleteError } = await supabase
      .from("children")
      .delete()
      .eq("id", removingChild.id)
      .eq("parent_id", parentId)
      .select("id")
      .single();

    setSaving(false);

    if (deleteError) {
      setError("הסרת הילד/ה נכשלה. נסו שוב בעוד רגע.");
      return;
    }

    closeRemove();
    router.refresh();
  }

  const hidden = Math.max(0, kids.length - PREVIEW_LIMIT);

  return (
    <>
      <Card id="children" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>הילדים שלי</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          {kids.slice(0, PREVIEW_LIMIT).map((child) => (
            <div
              key={child.id}
              className="order-3 flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-sm font-bold text-white">
                {initials(child.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">
                  {child.full_name}
                </p>
                <p className="text-xs text-ink-500">{childMeta(child)}</p>
              </div>
              <Badge
                tone={child.activities.length > 0 ? "success" : "neutral"}
                className="shrink-0"
              >
                {child.activities.length > 0
                  ? `${child.activities.length} ${child.activities.length === 1 ? "חוג" : "חוגים"}`
                  : "ללא חוג"}
              </Badge>
              <ChildActions
                child={child}
                onEdit={openEdit}
                onRemove={setRemovingChild}
              />
            </div>
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="order-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
            >
              הצג את כל הילדים
              <span className="rounded-full bg-white px-1.5 text-xs font-bold tabular-nums">
                {kids.length}
              </span>
            </button>
          )}

          <div className="order-1 flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 font-display text-sm font-bold text-ink-600">
              {initials(parentName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{parentName}</p>
              <p className="text-xs text-ink-500">
                {personalActivities.length > 0
                  ? "רישום אישי על שמכם"
                  : "בעל/ת החשבון"}
              </p>
            </div>
            <Badge
              tone={personalActivities.length > 0 ? "success" : "neutral"}
              className="shrink-0"
            >
              {personalActivities.length > 0
                ? `${personalActivities.length} ${
                    personalActivities.length === 1 ? "חוג" : "חוגים"
                  }`
                : "הורה"}
            </Badge>
          </div>

          {kids.length === 0 && (
            <p className="order-3 text-sm text-ink-500">
              לא נוספו ילדים עדיין.
            </p>
          )}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group order-2 flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 px-4 py-3 text-start transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform group-hover:rotate-90">
              <Icon name="plus" size={18} stroke={2.5} />
            </span>
            <span className="text-sm font-bold text-ink-900">
              הוספת ילד/ה לחשבון
            </span>
          </button>
        </CardContent>
      </Card>

      <Modal
        open={allOpen}
        onClose={() => setAllOpen(false)}
        title="כל הילדים שלי"
        description={`${kids.length} ילדים משויכים לחשבון`}
        className="max-w-2xl"
      >
        <ul className="space-y-3">
          {kids.map((child) => (
            <li
              key={child.id}
              className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-sm font-bold text-white">
                  {initials(child.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-ink-900">
                    {child.full_name}
                  </p>
                  <p className="text-sm text-ink-500">{childMeta(child)}</p>
                </div>
                <ChildActions
                  child={child}
                  onEdit={(selectedChild) => {
                    setAllOpen(false);
                    openEdit(selectedChild);
                  }}
                  onRemove={(selectedChild) => {
                    setAllOpen(false);
                    setRemovingChild(selectedChild);
                  }}
                />
              </div>

              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Detail label="תאריך לידה" value={formatDate(child.birth_date)} />
                <Detail
                  label="כיתה"
                  value={
                    formatSchoolGrade(
                      child.school_grade,
                      child.grade_school_year,
                    ) ?? "לא צוינה"
                  }
                />
                <Detail
                  label="מין"
                  value={child.gender ? GENDER[child.gender] : "לא צוין"}
                />
              </dl>

              <div className="mt-3">
                <p className="text-xs font-semibold text-ink-500">
                  פעילויות פעילות
                </p>
                {child.activities.length > 0 ? (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {child.activities.map((activity) => (
                      <li key={activity}>
                        <Badge tone="success">{activity}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">
                    עדיין לא רשום/ה לפעילות
                  </p>
                )}
              </div>

              {child.notes && (
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-ink-600">
                  {child.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Modal>

      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="הוספת ילד/ה"
        description="הפרטים יישמרו בחשבון ויאפשרו הרשמה מהירה לחוגים"
      >
        <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" htmlFor="childName" required className="sm:col-span-2">
            <Input
              id="childName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="לדוגמה: נועה כהן"
              required
            />
          </Field>
          <Field label="תאריך לידה" htmlFor="childBirth">
            <BirthDateInput
              id="childBirth"
              value={form.birth}
              onChange={(e) => setForm({ ...form, birth: e.target.value })}
            />
          </Field>
          <Field label="כיתה" htmlFor="childGrade" required>
            <Select
              id="childGrade"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              required
            >
              <option value="">בחרו כיתה...</option>
              {SCHOOL_GRADES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="מין" htmlFor="childGender" className="sm:col-span-2">
            <Select
              id="childGender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">בחרו...</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
              <option value="other">אחר</option>
            </Select>
          </Field>
          <Field
            label="הערות"
            htmlFor="childNotes"
            hint="רגישויות, מגבלות רפואיות או כל דבר שכדאי שהמדריכה תדע"
            className="sm:col-span-2"
          >
            <Textarea
              id="childNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-20"
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={saving || !form.name.trim() || !form.grade}
            >
              {saving ? "שומר..." : "שמירה"}
            </Button>
            <Button type="button" variant="outline" onClick={closeAdd}>
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingChild)}
        onClose={closeEdit}
        title={`עריכת הפרטים של ${editingChild?.full_name ?? ""}`}
        description="עדכנו את פרטי הילד/ה כפי שהם צריכים להופיע בחשבון"
      >
        <form onSubmit={handleEdit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="שם מלא"
            htmlFor="editChildName"
            required
            className="sm:col-span-2"
          >
            <Input
              id="editChildName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="תאריך לידה" htmlFor="editChildBirth">
            <BirthDateInput
              id="editChildBirth"
              value={form.birth}
              onChange={(e) => setForm({ ...form, birth: e.target.value })}
            />
          </Field>
          <Field label="כיתה" htmlFor="editChildGrade" required>
            <Select
              id="editChildGrade"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              required
            >
              <option value="">בחרו כיתה...</option>
              {SCHOOL_GRADES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="מין" htmlFor="editChildGender" className="sm:col-span-2">
            <Select
              id="editChildGender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">בחרו...</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
              <option value="other">אחר</option>
            </Select>
          </Field>
          <Field
            label="הערות"
            htmlFor="editChildNotes"
            hint="רגישויות, מגבלות רפואיות או כל דבר שכדאי שהמדריכה תדע"
            className="sm:col-span-2"
          >
            <Textarea
              id="editChildNotes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-20"
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 sm:col-span-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={saving || !form.name.trim() || !form.grade}
            >
              {saving ? "שומר..." : "שמירת שינויים"}
            </Button>
            <Button type="button" variant="outline" onClick={closeEdit}>
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(removingChild)}
        onClose={closeRemove}
        title={`הסרת ${removingChild?.full_name ?? "ילד/ה"} מהחשבון`}
        description="הפעולה משפיעה על המידע שמופיע בחשבון המשפחתי"
      >
        {removingChild?.canDelete ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="font-display font-bold text-red-900">
                להסיר את {removingChild.full_name}?
              </p>
              <p className="mt-1 text-sm text-red-700">
                הפעולה תמחק את פרטי הילד/ה מהחשבון ולא ניתן לבטל אותה.
              </p>
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                disabled={saving}
                onClick={handleRemove}
              >
                {saving ? "מסיר..." : "כן, להסיר"}
              </Button>
              <Button type="button" variant="outline" onClick={closeRemove}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="font-display font-bold text-amber-900">
                לא ניתן להסיר כרגע
              </p>
              <p className="mt-1 text-sm text-amber-800">
                קיימות עבור {removingChild?.full_name} הרשמות או רשימת המתנה.
                כדי לשמור על היסטוריית הפעילות והתשלומים, יש לפנות למשרד לפני
                ההסרה.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={closeRemove}>
              הבנתי
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

function ChildActions({
  child,
  onEdit,
  onRemove,
}: {
  child: ParentChild;
  onEdit: (child: ParentChild) => void;
  onRemove: (child: ParentChild) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(child)}
        aria-label={`עריכת הפרטים של ${child.full_name}`}
        title="עריכה"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Icon name="edit" size={17} />
      </button>
      <button
        type="button"
        onClick={() => onRemove(child)}
        aria-label={`הסרת ${child.full_name} מהחשבון`}
        title="הסרה"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      >
        <Icon name="trash" size={17} />
      </button>
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="font-medium text-ink-800">{value}</dd>
    </div>
  );
}

function childMeta(child: {
  birth_date: string | null;
  gender: Enums<"gender_type"> | null;
  school_grade: number | null;
  grade_school_year: number | null;
}): string {
  const parts: string[] = [];
  const grade = formatSchoolGrade(child.school_grade, child.grade_school_year);
  if (grade) parts.push(grade);

  const age = calcAge(child.birth_date);
  if (age !== null) {
    const prefix =
      child.gender === "female" ? "בת" : child.gender === "male" ? "בן" : "גיל";
    parts.push(`${prefix} ${age}`);
  } else if (!grade) {
    return "לא צוין תאריך לידה";
  }

  return parts.join(" · ");
}
