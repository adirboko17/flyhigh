"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GENDER, MIN_PASSWORD_LENGTH, isGenderType } from "@/lib/constants";
import type { Enums } from "@/types/database.types";
import {
  createInstructor,
  createInstructorAccount,
} from "@/lib/instructors/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";

export type InstructorFormData = {
  id: string;
  full_name: string;
  gender: Enums<"gender_type"> | null;
  phone: string | null;
  hourly_rate: number | null;
  status: "active" | "inactive";
  /** מזהה חשבון ההתחברות המשויך, אם נוצר כזה. */
  profile_id: string | null;
  email: string | null;
};

const emptyForm = {
  full_name: "",
  gender: "",
  phone: "",
  hourly_rate: "",
  status: "active",
};

function toFormState(existing?: InstructorFormData) {
  if (!existing) return emptyForm;
  return {
    full_name: existing.full_name,
    gender: existing.gender ?? "",
    phone: existing.phone ?? "",
    hourly_rate: existing.hourly_rate?.toString() ?? "",
    status: existing.status,
  };
}

interface InstructorFormProps {
  existing?: InstructorFormData;
  /** מסופק כשהטופס רץ בתוך מודאל — סוגר במקום לנווט, ובלי כרטיס עוטף. */
  onClose?: () => void;
}

export function InstructorForm({ existing, onClose }: InstructorFormProps) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const inModal = Boolean(onClose);
  const hasAccount = Boolean(existing?.profile_id);
  const [form, setForm] = useState(() => toFormState(existing));
  const [account, setAccount] = useState({
    enabled: false,
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function finish() {
    router.refresh();
    if (onClose) onClose();
    else router.push("/admin/instructors");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const wantsAccount = !hasAccount && account.enabled;
    if (wantsAccount) {
      if (!account.email.trim()) {
        setError("יש להזין מייל התחברות.");
        return;
      }
      if (account.password.length < MIN_PASSWORD_LENGTH) {
        setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
        return;
      }
    }

    const credentials = wantsAccount
      ? { email: account.email, password: account.password }
      : null;

    if (!isGenderType(form.gender)) {
      setError("נא לבחור מגדר.");
      return;
    }

    setLoading(true);

    if (!isEdit) {
      const result = await createInstructor({
        fullName: form.full_name,
        gender: form.gender,
        phone: form.phone || null,
        hourlyRate: form.hourly_rate ? Number(form.hourly_rate) : null,
        account: credentials,
      });
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      finish();
      return;
    }

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("instructors")
      .update({
        full_name: form.full_name,
        gender: form.gender,
        phone: form.phone || null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        status: form.status as "active" | "inactive",
      })
      .eq("id", existing!.id);

    if (dbError) {
      setError("אירעה שגיאה בשמירת המדריכה. בדקו את הפרטים ונסו שוב.");
      setLoading(false);
      return;
    }

    if (credentials) {
      const result = await createInstructorAccount({
        instructorId: existing!.id,
        account: credentials,
      });
      if (!result.success) {
        setError(`פרטי המדריכה נשמרו. יצירת ההתחברות נכשלה: ${result.error}`);
        setLoading(false);
        router.refresh();
        return;
      }
    }

    setLoading(false);
    finish();
  }

  const fields = (
    <>
      <Field label="שם מלא" required>
        <Input
          value={form.full_name}
          onChange={set("full_name")}
          placeholder="לדוגמה: דנה כהן"
          required
          autoFocus={inModal}
        />
      </Field>
      <Field label="מגדר" required>
        <Select value={form.gender} onChange={set("gender")} required>
          <option value="">בחרו...</option>
          <option value="male">{GENDER.male}</option>
          <option value="female">{GENDER.female}</option>
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="טלפון">
          <Input
            dir="ltr"
            value={form.phone}
            onChange={set("phone")}
            placeholder="052-7654321"
          />
        </Field>
        <Field label="תעריף שעתי (₪)">
          <Input
            type="number"
            min={0}
            step="1"
            value={form.hourly_rate}
            onChange={set("hourly_rate")}
          />
        </Field>
      </div>
      {isEdit && (
        <Field label="סטטוס">
          <Select value={form.status} onChange={set("status")}>
            <option value="active">
              {form.gender === "male" ? "פעיל" : "פעילה"}
            </option>
            <option value="inactive">
              {form.gender === "male" ? "לא פעיל" : "לא פעילה"}
            </option>
          </Select>
        </Field>
      )}

      {hasAccount ? (
        <ExistingAccountNotice email={existing?.email ?? null} />
      ) : (
        <AccountFields
          enabled={account.enabled}
          email={account.email}
          password={account.password}
          showPassword={showPassword}
          onToggleEnabled={(enabled) =>
            setAccount((a) => ({ ...a, enabled }))
          }
          onEmailChange={(email) => setAccount((a) => ({ ...a, email }))}
          onPasswordChange={(password) =>
            setAccount((a) => ({ ...a, password }))
          }
          onToggleShowPassword={() => setShowPassword((v) => !v)}
        />
      )}
    </>
  );

  return (
    <form onSubmit={submit} className={inModal ? "space-y-5" : "space-y-6"}>
      {inModal ? (
        <div className="space-y-5">{fields}</div>
      ) : (
        <Card>
          <CardContent className="space-y-5">{fields}</CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size={inModal ? "md" : "lg"} disabled={loading}>
          {loading ? "שומר..." : isEdit ? "עדכון" : "שמירה"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={inModal ? "md" : "lg"}
          disabled={loading}
          onClick={() =>
            onClose ? onClose() : router.push("/admin/instructors")
          }
        >
          ביטול
        </Button>
      </div>
    </form>
  );
}

function AccountFields({
  enabled,
  email,
  password,
  showPassword,
  onToggleEnabled,
  onEmailChange,
  onPasswordChange,
  onToggleShowPassword,
}: {
  enabled: boolean;
  email: string;
  password: string;
  showPassword: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onToggleShowPassword: () => void;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-ink-300 text-brand-600 focus:ring-2 focus:ring-brand-200"
        />
        <span>
          <span className="block text-sm font-semibold text-ink-800">
            יצירת פרטי התחברות למערכת
          </span>
          <span className="mt-0.5 block text-xs text-ink-500">
            המדריכה תוכל להתחבר עם המייל והסיסמה שתגדירו כאן ולראות את החוגים
            שלה.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-4 border-t border-ink-100 pt-4">
          <Field label="מייל התחברות" required>
            <Input
              type="email"
              dir="ltr"
              autoComplete="off"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="dana@example.com"
              required
            />
          </Field>
          <Field
            label="סיסמה"
            hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים. מסרו אותה למדריכה — היא תוכל לשנות אותה בעמוד ההגדרות.`}
            required
          >
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="ps-20 text-right"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute inset-y-0 end-2 my-auto h-8 rounded-lg px-2.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                {showPassword ? "הסתרה" : "הצגה"}
              </button>
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

function ExistingAccountNotice({ email }: { email: string | null }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/50 px-4 py-3">
      <p className="text-sm font-semibold text-ink-800">גישה למערכת</p>
      <p className="mt-1 text-sm text-ink-600">
        מייל התחברות:{" "}
        <span dir="ltr" className="font-medium text-ink-900">
          {email ?? "—"}
        </span>
      </p>
      <p className="mt-1 text-xs text-ink-400">
        שינוי הסיסמה מתבצע על ידי המדריכה בעמוד ההגדרות שלה.
      </p>
    </div>
  );
}

/** @deprecated use InstructorForm */
export const NewInstructorForm = InstructorForm;
