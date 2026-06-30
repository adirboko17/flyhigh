"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Select } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

const sectionTitle =
  "font-display text-[13px] font-extrabold uppercase tracking-wide text-brand-600";

type ChildForm = {
  name: string;
  birth: string;
  gender: string;
};

const emptyChild = (): ChildForm => ({ name: "", birth: "", gender: "" });

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("class");
  const wantsWaitlist = searchParams.get("waitlist") === "1";

  const [step, setStep] = useState<1 | 2>(1);
  const [parent, setParent] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [children, setChildren] = useState<ChildForm[]>([emptyChild()]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setParentField =
    (k: keyof typeof parent) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setParent((f) => ({ ...f, [k]: e.target.value }));

  function updateChild(
    index: number,
    field: keyof ChildForm,
    value: string
  ) {
    setChildren((list) =>
      list.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    );
  }

  function addChild() {
    setChildren((list) => [...list, emptyChild()]);
  }

  function removeChild(index: number) {
    setChildren((list) =>
      list.length <= 1 ? list : list.filter((_, i) => i !== index)
    );
  }

  function goToStep2() {
    setError(null);
    if (!parent.fullName.trim()) {
      setError("נא למלא שם מלא.");
      return;
    }
    if (!parent.phone.trim()) {
      setError("נא למלא מספר טלפון.");
      return;
    }
    if (!parent.email.trim()) {
      setError("נא למלא כתובת אימייל.");
      return;
    }
    if (parent.password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: parent.email,
      password: parent.password,
      options: {
        data: {
          full_name: parent.fullName,
          phone: parent.phone,
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

    const namedChildren = children.filter((c) => c.name.trim());

    if (namedChildren.length > 0 && signUpData.user) {
      for (const child of namedChildren) {
        const { data: inserted } = await supabase
          .from("children")
          .insert({
            parent_id: signUpData.user.id,
            full_name: child.name.trim(),
            birth_date: child.birth || null,
            gender: (child.gender || null) as
              | "male"
              | "female"
              | "other"
              | null,
          })
          .select("id")
          .single();

        if (classId && inserted) {
          if (wantsWaitlist) {
            await supabase.from("waitlist").insert({
              parent_id: signUpData.user.id,
              child_id: inserted.id,
              class_id: classId,
              status: "waiting",
            });
          } else {
            await supabase.from("enrollments").insert({
              parent_id: signUpData.user.id,
              child_id: inserted.id,
              class_id: classId,
              type: "class",
              status: "pending",
              payment_status: "unpaid",
            });
          }
        }
      }
    }

    router.push("/parent/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <div className="flex items-center gap-3">
        <StepBadge active={step === 1} done={step > 1} label="1" title="פרטי הורה" />
        <div className="h-px flex-1 bg-ink-100" />
        <StepBadge active={step === 2} done={false} label="2" title="פרטי ילדים" />
      </div>

      {step === 1 ? (
        <>
          <div className="flex flex-col gap-4">
            <h3 className={sectionTitle}>פרטי הורה</h3>
            <Field label="שם מלא" htmlFor="fullName" required variant="ds">
              <Input
                id="fullName"
                variant="ds"
                placeholder="מיכל לוי"
                value={parent.fullName}
                onChange={setParentField("fullName")}
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
                value={parent.phone}
                onChange={setParentField("phone")}
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
                value={parent.email}
                onChange={setParentField("email")}
                required
              />
            </Field>
            <Field
              label="סיסמה"
              htmlFor="password"
              hint="לפחות 6 תווים"
              required
              variant="ds"
            >
              <Input
                id="password"
                type="password"
                variant="ds"
                minLength={6}
                value={parent.password}
                onChange={setParentField("password")}
                required
              />
            </Field>
          </div>

          {error && <FormMessage tone="error">{error}</FormMessage>}

          <button
            type="button"
            onClick={goToStep2}
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
          >
            המשך לפרטי ילדים
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className={sectionTitle}>
                פרטי ילדים{" "}
                <span className="font-medium normal-case tracking-normal text-ink-400">
                  · אופציונלי
                </span>
              </h3>
            </div>
            <p className="text-sm text-ink-500">
              אפשר להוסיף כמה ילדים שרוצים. אפשר גם לדלג ולהוסיף אחר כך מהאזור
              האישי.
            </p>

            <div className="flex flex-col gap-4">
              {children.map((child, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-700">
                      ילד/ה {index + 1}
                    </p>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="text-sm font-medium text-ink-500 transition-colors hover:text-red-600"
                      >
                        הסרה
                      </button>
                    )}
                  </div>
                  <Field
                    label="שם הילד"
                    htmlFor={`childName-${index}`}
                    variant="ds"
                  >
                    <Input
                      id={`childName-${index}`}
                      variant="ds"
                      placeholder="איתי לוי"
                      value={child.name}
                      onChange={(e) =>
                        updateChild(index, "name", e.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="תאריך לידה"
                    htmlFor={`childBirth-${index}`}
                    variant="ds"
                  >
                    <Input
                      id={`childBirth-${index}`}
                      type="date"
                      dir="ltr"
                      variant="ds"
                      value={child.birth}
                      onChange={(e) =>
                        updateChild(index, "birth", e.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="מין"
                    htmlFor={`childGender-${index}`}
                    variant="ds"
                  >
                    <Select
                      id={`childGender-${index}`}
                      variant="ds"
                      value={child.gender}
                      onChange={(e) =>
                        updateChild(index, "gender", e.target.value)
                      }
                    >
                      <option value="">בחרו...</option>
                      <option value="male">זכר</option>
                      <option value="female">נקבה</option>
                      <option value="other">אחר</option>
                    </Select>
                  </Field>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addChild}
              className="ah-btn ah-btn--md ah-btn--outline ah-btn--block"
            >
              + הוספת ילד נוסף
            </button>
          </div>

          {error && <FormMessage tone="error">{error}</FormMessage>}
          {info && <FormMessage tone="info">{info}</FormMessage>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
              className="ah-btn ah-btn--lg ah-btn--outline ah-btn--block sm:flex-1"
              disabled={loading}
            >
              חזרה
            </button>
            <button
              type="submit"
              className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block sm:flex-[1.4]"
              disabled={loading}
            >
              {loading ? "יוצר חשבון..." : "יצירת חשבון"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function StepBadge({
  active,
  done,
  label,
  title,
}: {
  active: boolean;
  done: boolean;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
          active || done
            ? "bg-brand-600 text-white"
            : "bg-ink-100 text-ink-500"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          active ? "text-ink-900" : "text-ink-400"
        )}
      >
        {title}
      </span>
    </div>
  );
}

function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        tone === "error" ? "bg-red-50 text-red-600" : "bg-aqua-50 text-aqua-700"
      )}
    >
      {children}
    </p>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("already registered"))
    return "כתובת האימייל כבר רשומה במערכת.";
  if (message.toLowerCase().includes("password"))
    return "הסיסמה חייבת להכיל לפחות 6 תווים.";
  return "אירעה שגיאה ביצירת החשבון. נסו שוב.";
}
