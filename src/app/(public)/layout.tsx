import type { Viewport } from "next";
import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

/**
 * כל עמודי האתר נפתחים עם הירו כהה בראש העמוד, ולכן זה הצבע ההתחלתי של
 * שורות המערכת. ThemeColorSync מחליף אותו בזמן גלילה.
 */
export const viewport: Viewport = {
  themeColor: THEME_COLOR.hero,
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  const user = profile
    ? { full_name: profile.full_name, home: homeForRole(profile.role) }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* נחשף רק בניווט מקלדת, ומאפשר לדלג על התפריט ישר לתוכן. */}
      <a href="#main-content" className="a11y-skip-link">
        דילוג לתוכן המרכזי
      </a>
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <PublicHeader user={user} overlayAtTop />
      </Suspense>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter user={user} />
    </div>
  );
}
