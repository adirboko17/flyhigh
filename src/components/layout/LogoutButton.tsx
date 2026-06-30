"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";

export function LogoutButton({
  className,
  overlay = false,
}: {
  className?: string;
  /** מצב הדר שקוף בראש העמוד — טקסט לבן עם קו תחתון */
  overlay?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        overlay
          ? "text-white underline decoration-white underline-offset-4 hover:bg-white/10 hover:text-white"
          : "text-ink-600 hover:bg-red-50 hover:text-red-600",
        className
      )}
    >
      {!overlay && <span aria-hidden>🚪</span>}
      {loading ? "מתנתק..." : "התנתקות"}
    </button>
  );
}
