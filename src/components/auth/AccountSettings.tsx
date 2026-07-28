"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL } from "@/lib/constants";
import type { Enums } from "@/types/database.types";
import { formatDate } from "@/utils/format";

const MIN_PASSWORD_LENGTH = 8;

interface AccountSettingsProps {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Enums<"user_role">;
  createdAt: string;
}

export function AccountSettings({
  id,
  email,
  fullName,
  phone,
  role,
  createdAt,
}: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <IdentityCard
        email={email}
        fullName={fullName}
        role={role}
        createdAt={createdAt}
      />
      <ProfileCard id={id} fullName={fullName} phone={phone} />
      <PasswordCard email={email} />
    </div>
  );
}

function IdentityCard({
  email,
  fullName,
  role,
  createdAt,
}: {
  email: string;
  fullName: string;
  role: Enums<"user_role">;
  createdAt: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 bg-brand-gradient px-6 py-5 text-white">
        <Avatar
          name={fullName}
          className="h-14 w-14 border-2 border-white/30 text-lg"
        />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold">{fullName}</h2>
          <p className="mt-0.5 text-sm text-white/80">{ROLE_LABEL[role]}</p>
        </div>
      </div>
      <CardContent className="space-y-3">
        <DetailRow label="מייל התחברות" dir="ltr">
          {email}
        </DetailRow>
        <DetailRow label="תאריך הצטרפות">{formatDate(createdAt)}</DetailRow>
        <p className="pt-1 text-xs text-ink-400">
          מייל ההתחברות משמש לזיהוי במערכת ולא ניתן לשינוי מכאן. לשינוי כתובת
          המייל פנו לתמיכה.
        </p>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  children,
  dir,
}: {
  label: string;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-ink-500">{label}</span>
      <span dir={dir} className="text-left text-sm font-medium text-ink-900">
        {children}
      </span>
    </div>
  );
}

function ProfileCard({
  id,
  fullName,
  phone,
}: {
  id: string;
  fullName: string;
  phone: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName, phone: phone ?? "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty =
    form.fullName !== fullName || form.phone !== (phone ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!form.fullName.trim()) {
      setError("יש להזין שם מלא.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
      })
      .eq("id", id);
    setLoading(false);

    if (dbError) {
      setError("אירעה שגיאה בשמירת הפרטים. נסו שוב.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטים אישיים</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="שם מלא" required>
              <Input
                value={form.fullName}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, fullName: e.target.value }));
                }}
                required
              />
            </Field>
            <Field label="טלפון">
              <Input
                dir="ltr"
                value={form.phone}
                onChange={(e) => {
                  setSaved(false);
                  setForm((f) => ({ ...f, phone: e.target.value }));
                }}
                placeholder="052-7654321"
              />
            </Field>
          </div>

          {error && <FormError>{error}</FormError>}
          {saved && <FormSuccess>הפרטים עודכנו בהצלחה.</FormSuccess>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? "שומר..." : "שמירת פרטים"}
            </Button>
            {isDirty && !loading && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm({ fullName, phone: phone ?? "" });
                  setError(null);
                }}
              >
                ביטול
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard({ email }: { email: string }) {
  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaved(false);
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (form.next.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`);
      return;
    }
    if (form.next !== form.confirm) {
      setError("אימות הסיסמה אינו תואם לסיסמה החדשה.");
      return;
    }
    if (form.next === form.current) {
      setError("הסיסמה החדשה זהה לנוכחית.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // updateUser לא מוודא את הסיסמה הנוכחית, ולכן מאמתים אותה בהתחברות מחדש
    // כדי שמישהו עם גישה לדפדפן פתוח לא יוכל להשתלט על החשבון.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.current,
    });

    if (signInError) {
      setLoading(false);
      setError("הסיסמה הנוכחית שגויה.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: form.next,
    });
    setLoading(false);

    if (updateError) {
      setError("אירעה שגיאה בעדכון הסיסמה. נסו שוב.");
      return;
    }

    setForm({ current: "", next: "", confirm: "" });
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>שינוי סיסמה</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <Field label="סיסמה נוכחית" required>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={set("current")}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="סיסמה חדשה"
              hint={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
              required
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={form.next}
                onChange={set("next")}
                required
              />
            </Field>
            <Field label="אימות סיסמה חדשה" required>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set("confirm")}
                required
              />
            </Field>
          </div>

          {error && <FormError>{error}</FormError>}
          {saved && <FormSuccess>הסיסמה עודכנה בהצלחה.</FormSuccess>}

          <Button type="submit" disabled={loading}>
            {loading ? "מעדכן..." : "עדכון סיסמה"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
      {children}
    </p>
  );
}

function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-aqua-100 px-4 py-3 text-sm font-medium text-aqua-700">
      {children}
    </p>
  );
}
