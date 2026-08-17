"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

const SUBJECTS = [
  { value: "general", label: "פנייה כללית" },
  { value: "classes", label: "חוגים והרשמה" },
  { value: "programs", label: "מסלולים וכניסות" },
  { value: "other", label: "אחר" },
];

export function ContactForm() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    subject: "general",
    message: "",
  });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim()) {
      setError("נא למלא שם מלא.");
      return;
    }
    if (!form.phone.trim()) {
      setError("נא למלא מספר טלפון.");
      return;
    }
    if (!form.email.trim()) {
      setError("נא למלא כתובת אימייל.");
      return;
    }
    if (!form.message.trim()) {
      setError("נא לכתוב הודעה.");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoading(false);
    setSuccess(true);
    setForm({
      fullName: "",
      phone: "",
      email: "",
      subject: "general",
      message: "",
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
          style={{ background: "var(--logo-cyan)" }}
        >
          <span className="text-2xl">✓</span>
        </div>
        <h3 className="mt-4 font-display text-xl font-extrabold text-ink-900">
          הפנייה נשלחה בהצלחה
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          תודה שפניתם אלינו. נחזור אליכם בהקדם.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-6 text-sm font-semibold text-brand-700 underline underline-offset-4"
        >
          שליחת פנייה נוספת
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="שם מלא" htmlFor="contactName" required variant="ds">
        <Input
          id="contactName"
          variant="ds"
          placeholder="ישראל ישראלי"
          value={form.fullName}
          onChange={setField("fullName")}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="טלפון" htmlFor="contactPhone" required variant="ds">
          <Input
            id="contactPhone"
            type="tel"
            dir="ltr"
            variant="ds"
            placeholder="050-0000000"
            value={form.phone}
            onChange={setField("phone")}
            required
          />
        </Field>
        <Field label="אימייל" htmlFor="contactEmail" required variant="ds">
          <Input
            id="contactEmail"
            type="email"
            dir="ltr"
            variant="ds"
            placeholder="name@mail.com"
            value={form.email}
            onChange={setField("email")}
            required
          />
        </Field>
      </div>

      <Field label="נושא הפנייה" htmlFor="contactSubject" variant="ds">
        <Select
          id="contactSubject"
          variant="ds"
          value={form.subject}
          onChange={setField("subject")}
        >
          {SUBJECTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="הודעה" htmlFor="contactMessage" required variant="ds">
        <Textarea
          id="contactMessage"
          variant="ds"
          rows={5}
          placeholder="ספרו לנו במה נוכל לעזור..."
          value={form.message}
          onChange={setField("message")}
          required
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "hero-cta-primary ah-btn ah-btn--lg ah-btn--block",
          loading && "pointer-events-none opacity-70"
        )}
      >
        {loading ? "שולח..." : "שליחת פנייה"}
      </button>
    </form>
  );
}
