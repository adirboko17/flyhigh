"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  currentSchoolYear,
  parseSchoolGradeInput,
  SCHOOL_GRADES,
} from "@/lib/school-grade";
import { BirthDateInput } from "@/components/ui/BirthDateInput";
import { Field, Input, Select } from "@/components/ui/Input";
import { OtpInput, OTP_CODE_LENGTH } from "@/components/auth/OtpInput";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/utils/cn";

const MIN_PASSWORD_LENGTH = 8;

const STEPS = [
  { label: "פרטים אישיים" },
  { label: "ילדים" },
  { label: "פרטי התחברות" },
  { label: "אימות מייל" },
] as const;

type Step = 1 | 2 | 3 | 4;

type ChildDraft = {
  key: number;
  name: string;
  birth: string;
  gender: string;
  grade: string;
};

let childKey = 0;
const newChild = (): ChildDraft => ({
  key: ++childKey,
  name: "",
  birth: "",
  gender: "",
  grade: "",
});

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("class");
  const wantsWaitlist = searchParams.get("waitlist") === "1";

  const [step, setStep] = useState<Step>(1);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [details, setDetails] = useState({
    fullName: "",
    phone: "",
    birth: "",
    city: "",
    address: "",
    receiptName: "",
    receiptIdNumber: "",
  });
  const [wantsDifferentReceipt, setWantsDifferentReceipt] = useState(false);
  const [wantsChildren, setWantsChildren] = useState<boolean | null>(null);
  const [children, setChildren] = useState<ChildDraft[]>([newChild()]);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // התאריך המקסימלי נקבע אחרי ההידרציה, כדי שהשעון של השרת לא ייצור פער מול הדפדפן.
  const [maxBirthDate, setMaxBirthDate] = useState("");

  useEffect(() => {
    setMaxBirthDate(todayIso());
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const setDetailsField =
    (k: keyof typeof details) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setDetails((f) => ({ ...f, [k]: e.target.value }));

  const setCredentialsField =
    (k: keyof typeof credentials) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCredentials((f) => ({ ...f, [k]: e.target.value }));

  function updateChild(
    key: number,
    field: "name" | "birth" | "gender" | "grade",
    value: string,
  ) {
    setChildren((list) =>
      list.map((c) => (c.key === key ? { ...c, [field]: value } : c))
    );
  }

  function addChild() {
    setChildren((list) => [...list, newChild()]);
  }

  function removeChild(key: number) {
    setChildren((list) =>
      list.length <= 1 ? list : list.filter((c) => c.key !== key)
    );
  }

  function chooseChildren(value: boolean) {
    setError(null);
    setWantsChildren(value);
    if (value && children.length === 0) setChildren([newChild()]);
  }

  const namedChildren = wantsChildren
    ? children.filter((c) => c.name.trim())
    : [];

  function goNext() {
    setError(null);

    if (step === 1) {
      if (!details.fullName.trim()) return setError("נא למלא שם מלא.");
      if (!details.phone.trim()) return setError("נא למלא מספר טלפון.");
      if (!details.birth) return setError("נא למלא תאריך לידה.");
      const birthError = validateBirthDate(details.birth);
      if (birthError) return setError(birthError);
      if (!details.city.trim()) return setError("נא למלא עיר.");
      if (!details.address.trim()) return setError("נא למלא כתובת.");
      if (wantsDifferentReceipt) {
        if (!details.receiptName.trim())
          return setError("נא למלא שם על הקבלה.");
        if (!details.receiptIdNumber.trim())
          return setError("נא למלא מספר ח.פ / ת.ז.");
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (wantsChildren === null)
        return setError("בחרו אם להוסיף ילדים לחשבון.");
      if (wantsChildren && namedChildren.length === 0)
        return setError("נא למלא שם של ילד/ה אחד לפחות, או לבחור 'לא'.");
      if (wantsChildren) {
        const missingGrade = namedChildren.some(
          (child) => parseSchoolGradeInput(child.grade) === null,
        );
        if (missingGrade) return setError("נא לבחור כיתה לכל ילד/ה.");
      }
      setStep(3);
      return;
    }
  }

  function goBack() {
    setError(null);
    setStep((s) => (s === 3 ? 2 : 1));
  }

  async function completeRegistration(userId: string) {
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { pending_children: null } });

    await supabase
      .from("profiles")
      .update({
        receipt_name: wantsDifferentReceipt ? details.receiptName.trim() : null,
        receipt_id_number: wantsDifferentReceipt
          ? details.receiptIdNumber.trim()
          : null,
      })
      .eq("id", userId);

    if (classId) {
      const { data: created } = await supabase
        .from("children")
        .select("id")
        .eq("parent_id", userId);

      const childIds: (string | null)[] = created?.length
        ? created.map((c) => c.id)
        : [null];

      for (const childId of childIds) {
        if (wantsWaitlist) {
          await supabase.from("waitlist").insert({
            parent_id: userId,
            child_id: childId,
            class_id: classId,
            status: "waiting",
          });
        } else {
          await supabase.from("enrollments").insert({
            parent_id: userId,
            child_id: childId,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!credentials.email.trim()) return setError("נא למלא כתובת אימייל.");
    if (credentials.password.length < MIN_PASSWORD_LENGTH)
      return setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
    if (credentials.password !== credentials.confirm)
      return setError("אימות הסיסמה אינו תואם לסיסמה.");

    setLoading(true);
    const supabase = createClient();

    // הילדים נשלחים כ-metadata ולא כ-insert, כדי שייווצרו גם כשההרשמה
    // מחייבת אימות מייל ואין עדיין session שיעבור את מדיניות ה-RLS.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: credentials.email.trim(),
      password: credentials.password,
      options: {
        data: {
          full_name: details.fullName.trim(),
          phone: details.phone.trim(),
          birth_date: details.birth || null,
          city: details.city.trim(),
          address: details.address.trim(),
          role: "parent",
          receipt_name: wantsDifferentReceipt ? details.receiptName.trim() : null,
          receipt_id_number: wantsDifferentReceipt
            ? details.receiptIdNumber.trim()
            : null,
          pending_children: namedChildren.map((c) => ({
            full_name: c.name.trim(),
            birth_date: c.birth || null,
            gender: c.gender || null,
            school_grade: parseSchoolGradeInput(c.grade),
            grade_school_year: currentSchoolYear(),
          })),
        },
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setError("duplicate_email");
      setLoading(false);
      return;
    }

    if (!data.session) {
      setStep(4);
      setOtp("");
      setResendCooldown(60);
      setLoading(false);
      return;
    }

    if (data.user) {
      await completeRegistration(data.user.id);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const code = otp.replace(/\D/g, "");
    if (code.length !== OTP_CODE_LENGTH) {
      setError(`יש להזין קוד בן ${OTP_CODE_LENGTH} ספרות.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: credentials.email.trim(),
      token: code,
      type: "email",
    });

    if (verifyError) {
      setError(translateVerifyError(verifyError.message));
      setLoading(false);
      return;
    }

    if (data.user) {
      await completeRegistration(data.user.id);
      return;
    }

    setError("לא הצלחנו לאמת את החשבון. נסו שוב.");
    setLoading(false);
  }

  async function handleResendOtp() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: credentials.email.trim(),
    });

    setLoading(false);

    if (resendError) {
      setError("לא הצלחנו לשלוח קוד חדש. נסו שוב בעוד רגע.");
      return;
    }

    setOtp("");
    setResendCooldown(60);
  }

  if (step === 4) {
    return (
      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
        <Stepper current={4} />

        <div className="animate-fade-in flex flex-col gap-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Icon name="mail" size={22} />
          </span>
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">
              הזינו את קוד האימות
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              שלחנו קוד בן {OTP_CODE_LENGTH} ספרות ל-
              <span dir="ltr" className="break-all font-semibold text-ink-700">
                {" "}
                {credentials.email}
              </span>
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={loading}
            error={Boolean(error)}
          />

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
            disabled={loading || otp.replace(/\D/g, "").length !== OTP_CODE_LENGTH}
          >
            {loading ? "מאמת..." : "אימות והמשך"}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading || resendCooldown > 0}
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-400"
          >
            {resendCooldown > 0
              ? `שליחה מחדש בעוד ${resendCooldown} שניות`
              : "לא קיבלתם? שליחת קוד מחדש"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Stepper current={step} />

      {step === 1 && (
        <div className="animate-fade-in flex flex-col gap-4">
          <Field label="שם מלא" htmlFor="fullName" required variant="ds">
            <Input
              id="fullName"
              variant="ds"
              autoComplete="name"
              placeholder="מיכל לוי"
              value={details.fullName}
              onChange={setDetailsField("fullName")}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="מספר טלפון" htmlFor="phone" required variant="ds">
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                variant="ds"
                autoComplete="tel"
                placeholder="050-0000000"
                value={details.phone}
                onChange={setDetailsField("phone")}
              />
            </Field>
            <Field label="תאריך לידה" htmlFor="birth" required variant="ds">
              <BirthDateInput
                id="birth"
                autoComplete="bday"
                max={maxBirthDate || undefined}
                value={details.birth}
                onChange={setDetailsField("birth")}
              />
            </Field>
          </div>
          <Field label="עיר" htmlFor="city" required variant="ds">
            <Input
              id="city"
              variant="ds"
              autoComplete="address-level2"
              placeholder="חדרה"
              value={details.city}
              onChange={setDetailsField("city")}
            />
          </Field>
          <Field label="כתובת" htmlFor="address" required variant="ds">
            <Input
              id="address"
              variant="ds"
              autoComplete="street-address"
              placeholder="הרצל 12"
              value={details.address}
              onChange={setDetailsField("address")}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3 transition-colors hover:border-ink-200">
            <input
              type="checkbox"
              checked={wantsDifferentReceipt}
              onChange={(e) => {
                const checked = e.target.checked;
                setWantsDifferentReceipt(checked);
                if (!checked) {
                  setDetails((current) => ({
                    ...current,
                    receiptName: "",
                    receiptIdNumber: "",
                  }));
                }
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
            />
            <span className="text-sm font-medium text-ink-800">
              צריכים פרטים שונים לקבלה?
            </span>
          </label>

          {wantsDifferentReceipt && (
            <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <Field
                label="שם על הקבלה"
                htmlFor="receiptName"
                required
                variant="ds"
              >
                <Input
                  id="receiptName"
                  variant="ds"
                  placeholder="שם החברה או שם מלא"
                  value={details.receiptName}
                  onChange={setDetailsField("receiptName")}
                />
              </Field>
              <Field
                label="מספר ח.פ / ת.ז"
                htmlFor="receiptIdNumber"
                required
                variant="ds"
              >
                <Input
                  id="receiptIdNumber"
                  variant="ds"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="123456789"
                  value={details.receiptIdNumber}
                  onChange={setDetailsField("receiptIdNumber")}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in flex flex-col gap-4">
          <div className="text-right">
            <h3 className="font-display text-[17px] font-extrabold text-ink-900">
              להוסיף ילדים לחשבון?
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              נרשמים לחוג עבור עצמכם? אין צורך. תמיד אפשר להוסיף ילדים גם אחר כך
              מהאזור האישי.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={wantsChildren === true}
              onClick={() => chooseChildren(true)}
              icon="child"
              title="כן, נוסיף ילדים"
              subtitle="הרשמה עבור ילד/ה אחד או יותר"
            />
            <ChoiceCard
              selected={wantsChildren === false}
              onClick={() => chooseChildren(false)}
              icon="user"
              title="לא, נרשם/ת לעצמי"
              subtitle="חשבון למבוגר/ת בלבד"
            />
          </div>

          {wantsChildren && (
            <div className="animate-fade-in flex flex-col gap-4">
              {children.map((child, index) => (
                <div
                  key={child.key}
                  className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink-700">
                      ילד/ה {index + 1}
                    </p>
                    {children.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(child.key)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`הסרת ילד/ה ${index + 1}`}
                      >
                        <Icon name="x" size={15} />
                      </button>
                    )}
                  </div>
                  <Field
                    label="שם הילד/ה"
                    htmlFor={`childName-${child.key}`}
                    required
                    variant="ds"
                  >
                    <Input
                      id={`childName-${child.key}`}
                      variant="ds"
                      placeholder="איתי לוי"
                      value={child.name}
                      onChange={(e) =>
                        updateChild(child.key, "name", e.target.value)
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="תאריך לידה"
                      htmlFor={`childBirth-${child.key}`}
                      variant="ds"
                    >
                      <BirthDateInput
                        id={`childBirth-${child.key}`}
                        max={maxBirthDate || undefined}
                        value={child.birth}
                        onChange={(e) =>
                          updateChild(child.key, "birth", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="כיתה"
                      htmlFor={`childGrade-${child.key}`}
                      required
                      variant="ds"
                    >
                      <Select
                        id={`childGrade-${child.key}`}
                        variant="ds"
                        value={child.grade}
                        onChange={(e) =>
                          updateChild(child.key, "grade", e.target.value)
                        }
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
                    <Field
                      label="מין"
                      htmlFor={`childGender-${child.key}`}
                      variant="ds"
                      className="sm:col-span-2"
                    >
                      <Select
                        id={`childGender-${child.key}`}
                        variant="ds"
                        value={child.gender}
                        onChange={(e) =>
                          updateChild(child.key, "gender", e.target.value)
                        }
                      >
                        <option value="">בחרו...</option>
                        <option value="male">זכר</option>
                        <option value="female">נקבה</option>
                        <option value="other">אחר</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addChild}
                className="group flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4 text-right transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:shadow-card"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition-transform group-hover:rotate-90">
                  <Icon name="plus" size={18} stroke={2.5} />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-[15px] font-extrabold text-ink-900">
                    הוספת ילד/ה נוסף/ת
                  </span>
                  <span className="block text-xs text-ink-500">
                    שם, כיתה, תאריך לידה ומין
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in flex flex-col gap-4">
          <div className="text-right">
            <h3 className="font-display text-[17px] font-extrabold text-ink-900">
              פרטי התחברות
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              באמצעות הפרטים האלה תיכנסו לחשבון מכל מקום.
            </p>
          </div>

          <Field label="אימייל" htmlFor="email" required variant="ds">
            <Input
              id="email"
              type="email"
              dir="ltr"
              variant="ds"
              autoComplete="email"
              placeholder="michal@mail.com"
              value={credentials.email}
              onChange={setCredentialsField("email")}
            />
          </Field>
          <Field
            label="סיסמה"
            htmlFor="password"
            hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
            required
            variant="ds"
          >
            <Input
              id="password"
              type="password"
              variant="ds"
              autoComplete="new-password"
              value={credentials.password}
              onChange={setCredentialsField("password")}
            />
          </Field>
          <Field label="אימות סיסמה" htmlFor="confirm" required variant="ds">
            <Input
              id="confirm"
              type="password"
              variant="ds"
              autoComplete="new-password"
              value={credentials.confirm}
              onChange={setCredentialsField("confirm")}
            />
          </Field>

          <Summary
            fullName={details.fullName}
            city={details.city}
            childrenCount={namedChildren.length}
          />
        </div>
      )}

      {error && error !== "duplicate_email" && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {error === "duplicate_email" && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">המייל הזה כבר רשום במערכת.</p>
          <p className="mt-1">
            לא נשלח קוד אימות חדש למייל שכבר מאומת.{" "}
            <Link href="/login" className="font-bold text-brand-600 hover:underline">
              התחברו לחשבון
            </Link>{" "}
            או השתמשו במייל אחר.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {step === 3 ? (
          <button
            type="submit"
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block sm:flex-[1.4]"
            disabled={loading}
          >
            {loading ? "יוצר חשבון..." : "יצירת חשבון"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block sm:flex-[1.4]"
          >
            {step === 1 ? "המשך" : "המשך לפרטי התחברות"}
          </button>
        )}
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="ah-btn ah-btn--lg ah-btn--outline ah-btn--block sm:flex-1"
            disabled={loading}
          >
            חזרה
          </button>
        )}
      </div>
    </form>
  );
}

function Stepper({ current }: { current: Step }) {
  const currentLabel = STEPS[current - 1]?.label;

  return (
    <div className="space-y-2">
      {/* במובייל אין מקום לתוויות בכל צעד, ולכן מוצג שם הצעד הנוכחי מעל הפס. */}
      <p className="text-xs font-semibold text-ink-500 sm:hidden">
        שלב {current} מתוך {STEPS.length} · {currentLabel}
      </p>
      <ol className="flex list-none items-center gap-2 p-0">
      {STEPS.map((s, i) => {
        const index = i + 1;
        const done = current > index;
        const active = current === index;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                done
                  ? "bg-aqua-500 text-white"
                  : active
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-500"
              )}
            >
              {done ? <Icon name="check" size={14} stroke={3} /> : index}
            </span>
            <span
              className={cn(
                "hidden text-[13px] font-semibold sm:block",
                active ? "text-ink-900" : "text-ink-400"
              )}
            >
              {s.label}
            </span>
            {index < STEPS.length && (
              <span className="h-px flex-1 bg-ink-100" />
            )}
          </li>
        );
      })}
      </ol>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: "child" | "user";
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border-2 p-4 text-right transition-all hover:-translate-y-0.5",
        selected
          ? "border-brand-500 bg-brand-50 shadow-card"
          : "border-ink-100 bg-white hover:border-brand-200"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          selected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="font-display text-[15px] font-extrabold text-ink-900">
        {title}
      </span>
      <span className="text-xs text-ink-500">{subtitle}</span>
    </button>
  );
}

function Summary({
  fullName,
  city,
  childrenCount,
}: {
  fullName: string;
  city: string;
  childrenCount: number;
}) {
  return (
    <ul className="flex list-none flex-col gap-1.5 rounded-2xl bg-ink-50 p-4 text-sm text-ink-600">
      <li className="flex items-center gap-2">
        <span className="text-aqua-600">
          <Icon name="check" size={15} stroke={2.5} />
        </span>
        {fullName}
        {city && ` · ${city}`}
      </li>
      <li className="flex items-center gap-2">
        <span className="text-aqua-600">
          <Icon name="check" size={15} stroke={2.5} />
        </span>
        {childrenCount === 0
          ? "חשבון ללא ילדים"
          : childrenCount === 1
            ? "ילד/ה אחד/ת בחשבון"
            : `${childrenCount} ילדים בחשבון`}
      </li>
    </ul>
  );
}

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function validateBirthDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "תאריך הלידה אינו תקין.";
  if (value > todayIso()) return "תאריך הלידה לא יכול להיות בעתיד.";
  if (Number(value.slice(0, 4)) < 1900) return "תאריך הלידה אינו תקין.";
  return null;
}

function translateAuthError(message: string): string {
  if (message.includes("already registered"))
    return "כתובת האימייל כבר רשומה במערכת.";
  if (message.toLowerCase().includes("password"))
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  return "אירעה שגיאה ביצירת החשבון. נסו שוב.";
}

function translateVerifyError(message: string): string {
  if (message.toLowerCase().includes("expired"))
    return "הקוד פג תוקף. שלחו קוד חדש ונסו שוב.";
  if (message.toLowerCase().includes("invalid"))
    return "הקוד שגוי. בדקו את המייל ונסו שוב.";
  return "לא הצלחנו לאמת את הקוד. נסו שוב.";
}
