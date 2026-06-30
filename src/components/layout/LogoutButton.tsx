"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";

export function LogoutButton({ className }: { className?: string }) {
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
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50",
        className
      )}
    >
      <span>🚪</span>
      {loading ? "מתנתק..." : "התנתקות"}
    </button>
  );
}
