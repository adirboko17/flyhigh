"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ViewAllDialog } from "@/components/ui/ViewAllDialog";
import { GENDER } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database.types";
import { calcAge, formatDate, initials } from "@/utils/format";

export type ParentChild = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: Enums<"gender_type"> | null;
  notes: string | null;
  /** שמות הפעילויות הפעילות של הילד/ה. */
  activities: string[];
};

/** כמה ילדים להציג בכרטיס עצמו לפני שעוברים ל"צפה בהכל". */
const PREVIEW_LIMIT = 3;

const EMPTY_FORM = { name: "", birth: "", gender: "", notes: "" };

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function closeAdd() {
    setAddOpen(false);
    setError(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: insertError } = await createClient().from("children").insert({
      parent_id: parentId,
      full_name: form.name.trim(),
      birth_date: form.birth || null,
      gender: (form.gender || null) as Enums<"gender_type"> | null,
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

  const hidden = Math.max(0, kids.length - PREVIEW_LIMIT);

  return (
    <>
      <Card id="children" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>הילדים שלי</CardTitle>
          <ViewAllDialog
            title="הילדים שלי"
            description="כל הילדים המשויכים לחשבון והפעילויות שלהם"
            count={kids.length}
            disabled={kids.length === 0}
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
                  </div>

                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <Detail label="תאריך לידה" value={formatDate(child.birth_date)} />
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
          </ViewAllDialog>
        </CardHeader>

        <CardContent className="space-y-2">
          {kids.slice(0, PREVIEW_LIMIT).map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3"
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
            </div>
          ))}

          {hidden > 0 && (
            <p className="px-1 text-xs text-ink-400">
              ועוד {hidden} {hidden === 1 ? "ילד/ה" : "ילדים"} — נפתחים בכפתור צפה
              בהכל
            </p>
          )}

          {personalActivities.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 font-display text-sm font-bold text-ink-600">
                {initials(parentName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{parentName}</p>
                <p className="text-xs text-ink-500">רישום אישי על שמכם</p>
              </div>
              <Badge tone="success" className="shrink-0">
                {personalActivities.length}{" "}
                {personalActivities.length === 1 ? "חוג" : "חוגים"}
              </Badge>
            </div>
          )}

          {kids.length === 0 && personalActivities.length === 0 && (
            <p className="text-sm text-ink-500">
              לא נוספו ילדים עדיין — נרשמתם לעצמכם? אין צורך להוסיף.
            </p>
          )}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 px-4 py-3 text-start transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50"
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
        open={addOpen}
        onClose={closeAdd}
        title="הוספת ילד/ה"
        description="הפרטים יישמרו בחשבון ויאפשרו הרשמה מהירה לחוגים"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
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
            <Input
              id="childBirth"
              type="date"
              dir="ltr"
              value={form.birth}
              onChange={(e) => setForm({ ...form, birth: e.target.value })}
            />
          </Field>
          <Field label="מין" htmlFor="childGender">
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
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "שומר..." : "שמירה"}
            </Button>
            <Button type="button" variant="outline" onClick={closeAdd}>
              ביטול
            </Button>
          </div>
        </form>
      </Modal>
    </>
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
}): string {
  const age = calcAge(child.birth_date);
  if (age === null) return "לא צוין תאריך לידה";
  const prefix =
    child.gender === "female" ? "בת" : child.gender === "male" ? "בן" : "גיל";
  return `${prefix} ${age}`;
}
