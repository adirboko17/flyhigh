"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/Input";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  instructor: "/instructor",
  parent: "/parent/dashboard",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email, password }
    );

    if (signInError) {
      setError("האימייל או הסיסמה שגויים. נסו שוב.");
      setLoading(false);
      return;
    }

    let target = redirect;
    if (!target && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      target = ROLE_HOME[profile?.role ?? "parent"] ?? "/";
    }

    router.push(target ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <Field label="אימייל" htmlFor="email" required variant="ds">
        <Input
          id="email"
          type="email"
          dir="ltr"
          variant="ds"
          autoComplete="email"
          placeholder="michal@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>

      <Field label="סיסמה" htmlFor="password" required variant="ds">
        <Input
          id="password"
          type="password"
          variant="ds"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>

      <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[13.5px] text-ink-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-[15px] w-[15px] accent-brand-600"
          />
          זכרו אותי
        </label>
        <span
          className="cursor-default text-[13.5px] font-semibold text-brand-600 opacity-70"
          title="איפוס סיסמה - בקרוב"
        >
          שכחתם סיסמה?
        </span>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
        disabled={loading}
      >
        {loading ? "מתחבר..." : "כניסה לחשבון"}
      </button>
    </form>
  );
}
