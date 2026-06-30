"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select } from "@/components/ui/Input";

const sectionTitle =
  "font-display text-[13px] font-extrabold uppercase tracking-wide text-brand-600";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("class");
  const wantsWaitlist = searchParams.get("waitlist") === "1";

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    childName: "",
    childBirth: "",
    childGender: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
          role: "parent",
        },
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    if (!signUpData.session) {
      setInfo(
        "החשבון נוצר! שלחנו אליכם מייל לאימות הכתובת. לאחר האימות, התחברו לאזור האישי."
      );
      setLoading(false);
      return;
    }

    if (form.childName && signUpData.user) {
      const { data: child } = await supabase
        .from("children")
        .insert({
          parent_id: signUpData.user.id,
          full_name: form.childName,
          birth_date: form.childBirth || null,
          gender: (form.childGender || null) as
            | "male"
            | "female"
            | "other"
            | null,
        })
        .select("id")
        .single();

      if (classId && child) {
        if (wantsWaitlist) {
          await supabase.from("waitlist").insert({
            parent_id: signUpData.user.id,
            child_id: child.id,
            class_id: classId,
            status: "waiting",
          });
        } else {
          await supabase.from("enrollments").insert({
            parent_id: signUpData.user.id,
            child_id: child.id,
            class_id: classId,
            type: "class",
            status: "pending",
            payment_status: "unpaid",
          });
        }
      }
    }

    router.push("/parent/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4">
        <h3 className={sectionTitle}>פרטי הורה</h3>
        <Field label="שם מלא" htmlFor="fullName" required variant="ds">
          <Input
            id="fullName"
            variant="ds"
            placeholder="מיכל לוי"
            value={form.fullName}
            onChange={set("fullName")}
            required
          />
        </Field>
        <Field label="טלפון" htmlFor="phone" required variant="ds">
          <Input
            id="phone"
            type="tel"
            dir="ltr"
            variant="ds"
            placeholder="050-0000000"
            value={form.phone}
            onChange={set("phone")}
            required
          />
        </Field>
        <Field label="אימייל" htmlFor="email" required variant="ds">
          <Input
            id="email"
            type="email"
            dir="ltr"
            variant="ds"
            placeholder="michal@mail.com"
            value={form.email}
            onChange={set("email")}
            required
          />
        </Field>
        <Field label="סיסמה" htmlFor="password" hint="לפחות 6 תווים" required variant="ds">
          <Input
            id="password"
            type="password"
            variant="ds"
            minLength={6}
            value={form.password}
            onChange={set("password")}
            required
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4 border-t border-ink-100 pt-[18px]">
        <h3 className={sectionTitle}>
          פרטי ילד{" "}
          <span className="font-medium normal-case tracking-normal text-ink-400">
            · אופציונלי
          </span>
        </h3>
        <Field label="שם הילד" htmlFor="childName" variant="ds">
          <Input
            id="childName"
            variant="ds"
            placeholder="איתי לוי"
            value={form.childName}
            onChange={set("childName")}
          />
        </Field>
        <Field label="תאריך לידה" htmlFor="childBirth" variant="ds">
          <Input
            id="childBirth"
            type="date"
            dir="ltr"
            variant="ds"
            value={form.childBirth}
            onChange={set("childBirth")}
          />
        </Field>
        <Field label="מין" htmlFor="childGender" variant="ds">
          <Select id="childGender" variant="ds" value={form.childGender} onChange={set("childGender")}>
            <option value="">בחרו...</option>
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
            <option value="other">אחר</option>
          </Select>
        </Field>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl bg-aqua-50 px-4 py-3 text-sm font-medium text-aqua-700">
          {info}
        </p>
      )}

      <button
        type="submit"
        className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
        disabled={loading}
      >
        {loading ? "יוצר חשבון..." : "יצירת חשבון"}
      </button>
    </form>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("already registered")) return "כתובת האימייל כבר רשומה במערכת.";
  if (message.toLowerCase().includes("password")) return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  return "אירעה שגיאה ביצירת החשבון. נסו שוב.";
}
