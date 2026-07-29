"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/Input";
import { OtpInput, OTP_CODE_LENGTH } from "@/components/auth/OtpInput";
import { Icon } from "@/components/icons/Icon";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { cn } from "@/utils/cn";

const STEPS = [
  { label: "כתובת מייל" },
  { label: "אימות קוד" },
  { label: "סיסמה חדשה" },
] as const;

type Step = 1 | 2 | 3;

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const address = email.trim();
    if (!address) return setError("נא למלא כתובת אימייל.");

    setLoading(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(
      address
    );
    setLoading(false);

    if (sendError) {
      setError("לא הצלחנו לשלוח את הקוד. נסו שוב בעוד רגע.");
      return;
    }

    setStep(2);
    setOtp("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function resendCode() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(
      email.trim()
    );
    setLoading(false);

    if (sendError) {
      setError("לא הצלחנו לשלוח קוד חדש. נסו שוב בעוד רגע.");
      return;
    }

    setOtp("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode(e: React.FormEvent) {
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
      email: email.trim(),
      token: code,
      type: "recovery",
    });
    setLoading(false);

    if (verifyError) {
      setError(translateVerifyError(verifyError.message));
      return;
    }

    if (!data.session) {
      setError("לא הצלחנו לאמת את הקוד. נסו שוב.");
      return;
    }

    setStep(3);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH)
      return setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
    if (password !== confirm)
      return setError("אימות הסיסמה אינו תואם לסיסמה.");

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(translateUpdateError(updateError.message));
      setLoading(false);
      return;
    }

    // מתנתקים כדי שההתחברות הבאה תתבצע עם הסיסמה החדשה.
    await supabase.auth.signOut();
    router.push("/login?reset=1");
    router.refresh();
  }

  if (step === 1) {
    return (
      <form onSubmit={sendCode} className="flex flex-col gap-5">
        <Stepper current={step} />

        <div className="animate-fade-in flex flex-col gap-4">
          <div className="text-right">
            <h3 className="font-display text-[17px] font-extrabold text-ink-900">
              איפוס סיסמה
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              הזינו את כתובת המייל של החשבון ונשלח אליכם קוד בן{" "}
              {OTP_CODE_LENGTH} ספרות.
            </p>
          </div>

          <Field label="אימייל" htmlFor="reset-email" required variant="ds">
            <Input
              id="reset-email"
              type="email"
              dir="ltr"
              variant="ds"
              autoComplete="email"
              placeholder="michal@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <ErrorMessage error={error} />

          <button
            type="submit"
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
            disabled={loading}
          >
            {loading ? "שולח קוד..." : "שליחת קוד אימות"}
          </button>

          <p className="text-center text-sm text-ink-500">
            נזכרתם בסיסמה?{" "}
            <Link
              href="/login"
              className="font-bold text-brand-600 hover:underline"
            >
              חזרה להתחברות
            </Link>
          </p>
        </div>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-5">
        <Stepper current={step} />

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
                {email}
              </span>
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            disabled={loading}
            error={Boolean(error)}
          />

          <ErrorMessage error={error} />

          <button
            type="submit"
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
            disabled={
              loading || otp.replace(/\D/g, "").length !== OTP_CODE_LENGTH
            }
          >
            {loading ? "מאמת..." : "אימות והמשך"}
          </button>

          <button
            type="button"
            onClick={resendCode}
            disabled={loading || resendCooldown > 0}
            className="text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-400"
          >
            {resendCooldown > 0
              ? `שליחה מחדש בעוד ${resendCooldown} שניות`
              : "לא קיבלתם? שליחת קוד מחדש"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setError(null);
              setOtp("");
            }}
            className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
          >
            שינוי כתובת המייל
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={savePassword} className="flex flex-col gap-5">
      <Stepper current={step} />

      <div className="animate-fade-in flex flex-col gap-4">
        <div className="text-right">
          <h3 className="font-display text-[17px] font-extrabold text-ink-900">
            בחירת סיסמה חדשה
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            המייל אומת. בחרו סיסמה חדשה לחשבון ותתחברו איתה מעכשיו.
          </p>
        </div>

        <Field
          label="סיסמה חדשה"
          htmlFor="new-password"
          hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
          required
          variant="ds"
        >
          <Input
            id="new-password"
            type="password"
            variant="ds"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="אימות סיסמה" htmlFor="confirm-password" required variant="ds">
          <Input
            id="confirm-password"
            type="password"
            variant="ds"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <ErrorMessage error={error} />

        <button
          type="submit"
          className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
          disabled={loading}
        >
          {loading ? "שומר..." : "עדכון סיסמה"}
        </button>
      </div>
    </form>
  );
}

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {error}
    </p>
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

function translateVerifyError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("expired"))
    return "הקוד פג תוקף. שלחו קוד חדש ונסו שוב.";
  if (text.includes("invalid"))
    return "הקוד שגוי. בדקו את המייל ונסו שוב.";
  return "לא הצלחנו לאמת את הקוד. נסו שוב.";
}

function translateUpdateError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("should be different"))
    return "הסיסמה החדשה זהה לסיסמה הקודמת. בחרו סיסמה אחרת.";
  if (text.includes("password"))
    return `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`;
  return "לא הצלחנו לעדכן את הסיסמה. נסו שוב.";
}
