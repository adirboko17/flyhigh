"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { CLASS_WAITLIST_SKILL_LEVEL } from "@/lib/constants";
import { submitClassWaitlistRequest } from "@/lib/waitlist-requests/actions";
import { cn } from "@/utils/cn";

const emptyForm = {
  fullName: "",
  phone: "",
  childName: "",
  childAge: "",
  childGender: "",
  skillLevel: "",
  desiredClassName: "",
  preferredTimes: "",
  website: "",
};

export function ClassWaitlistCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const setField =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  function closeModal() {
    setOpen(false);
    setError(null);
    setSuccess(false);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await submitClassWaitlistRequest(form);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "לא הצלחנו לשלוח את הפנייה.");
      return;
    }

    setSuccess(true);
    setForm(emptyForm);
  }

  return (
    <>
      <ScrollReveal>
        <aside
          aria-labelledby="class-waitlist-heading"
          className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(236,0,140,0.08)_0%,rgba(13,82,133,0.06)_48%,rgba(0,174,239,0.10)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -end-16 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(236,0,140,0.16),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -start-10 -bottom-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,174,239,0.16),transparent_70%)]"
          />

          <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-9">
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-bold tracking-wide text-[var(--logo-magenta)]">
                רשימת המתנה לחוגים חדשים
              </p>
              <h2
                id="class-waitlist-heading"
                className="mt-1.5 font-display text-[22px] font-extrabold leading-snug text-ink-900 sm:text-[26px]"
              >
                לא מצאתם חוג שמתאים?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600 sm:text-base">
                השאירו פרטים — גיל, רמה ומועדים שנוחים לכם. אם ייפתח חוג שמתאים,
                נהיה איתכם בקשר.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setError(null);
                setOpen(true);
              }}
              className="hero-cta-primary ah-btn ah-btn--lg shrink-0 self-start sm:self-center"
            >
              השארת פרטים
            </button>
          </div>
        </aside>
      </ScrollReveal>

      <Modal
        open={open}
        onClose={closeModal}
        title={success ? "הפנייה התקבלה" : "הצטרפות לרשימת המתנה"}
        description={
          success
            ? undefined
            : "מלאו את הפרטים ונחזור אליכם אם ייפתח חוג שמתאים."
        }
        className="max-w-xl"
      >
        {success ? (
          <div className="py-4 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: "var(--logo-cyan)" }}
            >
              <span className="text-2xl">✓</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              תודה! שמרנו את הפרטים. אם ייפתח חוג שמתאים — ניצור איתכם קשר.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-6"
              onClick={closeModal}
            >
              סגירה
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="שם מלא" htmlFor="waitlistFullName" required>
              <Input
                id="waitlistFullName"
                placeholder="ישראל ישראלי"
                value={form.fullName}
                onChange={setField("fullName")}
                autoComplete="name"
                required
              />
            </Field>

            <Field label="מספר טלפון" htmlFor="waitlistPhone" required>
              <Input
                id="waitlistPhone"
                type="tel"
                dir="ltr"
                placeholder="050-0000000"
                value={form.phone}
                onChange={setField("phone")}
                autoComplete="tel"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="שם הילד / הילדה" htmlFor="waitlistChildName" required>
                <Input
                  id="waitlistChildName"
                  placeholder="שם פרטי"
                  value={form.childName}
                  onChange={setField("childName")}
                  required
                />
              </Field>
              <Field label="גיל" htmlFor="waitlistChildAge" required>
                <Input
                  id="waitlistChildAge"
                  type="number"
                  min={1}
                  max={21}
                  inputMode="numeric"
                  placeholder="לדוגמה: 7"
                  value={form.childAge}
                  onChange={setField("childAge")}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="מגדר" htmlFor="waitlistChildGender" required>
                <Select
                  id="waitlistChildGender"
                  value={form.childGender}
                  onChange={setField("childGender")}
                  required
                >
                  <option value="">בחירה</option>
                  <option value="male">זכר</option>
                  <option value="female">נקבה</option>
                </Select>
              </Field>
              <Field label="רמה" htmlFor="waitlistSkillLevel" required>
                <Select
                  id="waitlistSkillLevel"
                  value={form.skillLevel}
                  onChange={setField("skillLevel")}
                  required
                >
                  <option value="">בחירה</option>
                  <option value="beginner">
                    {CLASS_WAITLIST_SKILL_LEVEL.beginner}
                  </option>
                  <option value="advanced">
                    {CLASS_WAITLIST_SKILL_LEVEL.advanced}
                  </option>
                </Select>
              </Field>
            </div>

            <Field
              label="איזה חוג תרצו?"
              htmlFor="waitlistDesiredClass"
              required
            >
              <Input
                id="waitlistDesiredClass"
                placeholder="לדוגמה: שחייה לבנות בגילאי 8–10"
                value={form.desiredClassName}
                onChange={setField("desiredClassName")}
                required
              />
            </Field>

            <Field
              label="אילו מועדים מתאימים לכם?"
              htmlFor="waitlistPreferredTimes"
              required
              hint="אפשר לכתוב ימים ושעות בחופשיות"
            >
              <Textarea
                id="waitlistPreferredTimes"
                rows={3}
                placeholder="לדוגמה: ימי ראשון או רביעי אחרי 16:00"
                value={form.preferredTimes}
                onChange={setField("preferredTimes")}
                required
              />
            </Field>

            <div className="hidden" aria-hidden>
              <label htmlFor="waitlistWebsite">אתר</label>
              <input
                id="waitlistWebsite"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={setField("website")}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "hero-cta-primary ah-btn ah-btn--lg ah-btn--block mt-1",
                loading && "pointer-events-none opacity-70"
              )}
            >
              {loading ? "שולח..." : "שליחת פנייה"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
