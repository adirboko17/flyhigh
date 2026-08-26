"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { BirthDateInput } from "@/components/ui/BirthDateInput";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import type { CustomerWithChildren } from "@/components/admin/customerTypes";
import {
  createCustomer,
  updateCustomer,
} from "@/lib/admin/customerActions";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import {
  parseSchoolGradeInput,
  resolveSchoolGrade,
  SCHOOL_GRADES,
} from "@/lib/school-grade";

type ChildDraft = {
  key: string;
  id?: string;
  name: string;
  birth: string;
  gender: string;
  grade: string;
  notes: string;
};

type ProfileForm = {
  fullName: string;
  phone: string;
  birth: string;
  gender: string;
  city: string;
  address: string;
  receiptName: string;
  receiptIdNumber: string;
};

function newChildKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyChild(): ChildDraft {
  return {
    key: newChildKey(),
    name: "",
    birth: "",
    gender: "",
    grade: "",
    notes: "",
  };
}

function toProfileForm(existing?: CustomerWithChildren): ProfileForm {
  return {
    fullName: existing?.full_name ?? "",
    phone: existing?.phone ?? "",
    birth: existing?.birth_date ?? "",
    gender: existing?.gender ?? "",
    city: existing?.city ?? "",
    address: existing?.address ?? "",
    receiptName: existing?.receipt_name ?? "",
    receiptIdNumber: existing?.receipt_id_number ?? "",
  };
}

function toChildDrafts(existing?: CustomerWithChildren): ChildDraft[] {
  if (!existing) return [];
  return existing.children.map((child) => {
    const currentGrade = resolveSchoolGrade(
      child.school_grade,
      child.grade_school_year
    );
    return {
      key: child.id,
      id: child.id,
      name: child.full_name,
      birth: child.birth_date ?? "",
      gender: child.gender ?? "",
      grade: currentGrade == null ? "" : String(currentGrade),
      notes: child.notes ?? "",
    };
  });
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function CustomerForm({
  existing,
  onClose,
}: {
  existing?: CustomerWithChildren;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [profile, setProfile] = useState(() => toProfileForm(existing));
  const [children, setChildren] = useState(() => toChildDrafts(existing));
  const [email, setEmail] = useState(existing?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wantsDifferentReceipt, setWantsDifferentReceipt] = useState(
    Boolean(existing?.receipt_name || existing?.receipt_id_number)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProfileField =
    (key: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setProfile((current) => ({ ...current, [key]: e.target.value }));

  function updateChild(key: string, field: keyof Omit<ChildDraft, "key" | "id">, value: string) {
    setChildren((list) =>
      list.map((child) => (child.key === key ? { ...child, [field]: value } : child))
    );
  }

  function payloadChildren() {
    return children
      .filter((child) => child.name.trim())
      .map((child) => ({
        id: child.id,
        fullName: child.name,
        birthDate: child.birth,
        gender: child.gender,
        grade: child.grade,
        notes: child.notes,
      }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isEdit && password !== confirm) {
      setError("אימות הסיסמה אינו תואם לסיסמה.");
      return;
    }

    const namedWithoutGrade = children.filter(
      (child) => child.name.trim() && parseSchoolGradeInput(child.grade) === null
    );
    if (namedWithoutGrade.length > 0) {
      setError("נא לבחור כיתה לכל ילד/ה.");
      return;
    }

    setLoading(true);
    const profileInput = {
      fullName: profile.fullName,
      phone: profile.phone,
      birthDate: profile.birth,
      gender: profile.gender,
      city: profile.city,
      address: profile.address,
      receiptName: wantsDifferentReceipt ? profile.receiptName : "",
      receiptIdNumber: wantsDifferentReceipt ? profile.receiptIdNumber : "",
    };

    const result = isEdit
      ? await updateCustomer({
          profileId: existing!.id,
          profile: profileInput,
          email,
          password: password || undefined,
          children: payloadChildren(),
        })
      : await createCustomer({
          profile: profileInput,
          email,
          password,
          children: payloadChildren(),
        });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-900">
          פרטי הלקוח
        </h3>
        <Field label="שם מלא" htmlFor="customerFullName" required>
          <Input
            id="customerFullName"
            value={profile.fullName}
            onChange={setProfileField("fullName")}
            placeholder="ישראל ישראלי"
            required
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="טלפון" htmlFor="customerPhone" required>
            <Input
              id="customerPhone"
              type="tel"
              dir="ltr"
              value={profile.phone}
              onChange={setProfileField("phone")}
              placeholder="050-0000000"
              required
            />
          </Field>
          <Field label="תאריך לידה" htmlFor="customerBirth" required>
            <BirthDateInput
              id="customerBirth"
              value={profile.birth}
              onChange={setProfileField("birth")}
              max={todayIso()}
            />
          </Field>
        </div>
        <Field label="מגדר" htmlFor="customerGender" required>
          <Select
            id="customerGender"
            value={profile.gender}
            onChange={setProfileField("gender")}
            required
          >
            <option value="">בחרו...</option>
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
            <option value="other">אחר</option>
          </Select>
        </Field>
        <Field label="עיר" htmlFor="customerCity" required>
          <Input
            id="customerCity"
            value={profile.city}
            onChange={setProfileField("city")}
            placeholder="חדרה"
            required
          />
        </Field>
        <Field label="כתובת" htmlFor="customerAddress" required>
          <Input
            id="customerAddress"
            value={profile.address}
            onChange={setProfileField("address")}
            placeholder="הרצל 12"
            required
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3">
          <input
            type="checkbox"
            checked={wantsDifferentReceipt}
            onChange={(e) => {
              const checked = e.target.checked;
              setWantsDifferentReceipt(checked);
              if (!checked) {
                setProfile((current) => ({
                  ...current,
                  receiptName: "",
                  receiptIdNumber: "",
                }));
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
          />
          <span className="text-sm font-medium text-ink-800">
            פרטים שונים לקבלה
          </span>
        </label>

        {wantsDifferentReceipt && (
          <div className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 sm:grid-cols-2">
            <Field label="שם על הקבלה" htmlFor="customerReceiptName">
              <Input
                id="customerReceiptName"
                value={profile.receiptName}
                onChange={setProfileField("receiptName")}
                placeholder="שם החברה או שם מלא"
              />
            </Field>
            <Field label="מספר ח.פ / ת.ז" htmlFor="customerReceiptId">
              <Input
                id="customerReceiptId"
                dir="ltr"
                inputMode="numeric"
                value={profile.receiptIdNumber}
                onChange={setProfileField("receiptIdNumber")}
                placeholder="123456789"
              />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">ילדים</h3>
          <p className="mt-1 text-sm text-ink-500">
            אפשר להוסיף עכשיו, או להשאיר ריק ולהשלים אחר כך.
          </p>
        </div>

        {children.map((child, index) => (
          <div
            key={child.key}
            className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink-700">ילד/ה {index + 1}</p>
              <button
                type="button"
                onClick={() =>
                  setChildren((list) => list.filter((item) => item.key !== child.key))
                }
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`הסרת ילד/ה ${index + 1}`}
              >
                <Icon name="x" size={15} />
              </button>
            </div>
            <Field label="שם הילד/ה" htmlFor={`childName-${child.key}`} required>
              <Input
                id={`childName-${child.key}`}
                value={child.name}
                onChange={(e) => updateChild(child.key, "name", e.target.value)}
                placeholder="איתי לוי"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="תאריך לידה" htmlFor={`childBirth-${child.key}`}>
                <BirthDateInput
                  id={`childBirth-${child.key}`}
                  value={child.birth}
                  onChange={(e) => updateChild(child.key, "birth", e.target.value)}
                  max={todayIso()}
                />
              </Field>
              <Field label="מגדר" htmlFor={`childGender-${child.key}`} required>
                <Select
                  id={`childGender-${child.key}`}
                  value={child.gender}
                  onChange={(e) => updateChild(child.key, "gender", e.target.value)}
                >
                  <option value="">בחרו...</option>
                  <option value="male">זכר</option>
                  <option value="female">נקבה</option>
                  <option value="other">אחר</option>
                </Select>
              </Field>
              <Field label="כיתה" htmlFor={`childGrade-${child.key}`} required>
                <Select
                  id={`childGrade-${child.key}`}
                  value={child.grade}
                  onChange={(e) => updateChild(child.key, "grade", e.target.value)}
                >
                  <option value="">בחרו כיתה...</option>
                  {SCHOOL_GRADES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="הערות" htmlFor={`childNotes-${child.key}`}>
                <Textarea
                  id={`childNotes-${child.key}`}
                  value={child.notes}
                  onChange={(e) => updateChild(child.key, "notes", e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setChildren((list) => [...list, emptyChild()])}
          className="group flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4 text-right transition-all hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <Icon name="plus" size={18} stroke={2.5} />
          </span>
          <span className="flex-1">
            <span className="block font-display text-[15px] font-extrabold text-ink-900">
              הוספת ילד/ה
            </span>
            <span className="block text-xs text-ink-500">
              שם, מגדר, כיתה ותאריך לידה
            </span>
          </span>
        </button>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">
            פרטי התחברות
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            {isEdit
              ? "אפשר לשנות מייל. השאירו את הסיסמה ריקה אם אין צורך בשינוי."
              : "הלקוח יוכל להתחבר מיד, בלי אימות מייל."}
          </p>
        </div>
        <Field label="אימייל" htmlFor="customerEmail" required>
          <Input
            id="customerEmail"
            type="email"
            dir="ltr"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="michal@mail.com"
            required
          />
        </Field>
        <Field
          label={isEdit ? "סיסמה חדשה" : "סיסמה"}
          htmlFor="customerPassword"
          hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
          required={!isEdit}
        >
          <Input
            id="customerPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isEdit ? undefined : MIN_PASSWORD_LENGTH}
            required={!isEdit}
          />
        </Field>
        {!isEdit && (
          <Field label="אימות סיסמה" htmlFor="customerConfirm" required>
            <Input
              id="customerConfirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
        )}
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          ביטול
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "שומר..."
            : isEdit
              ? "שמירת השינויים"
              : "הוספת לקוח"}
        </Button>
      </div>
    </form>
  );
}
