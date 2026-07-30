import type { Viewport } from "next";
import { Suspense } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getSessionProfile, homeForRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

const HEADER_SCROLL_INIT_SCRIPT = `(() => {
  if (window.__publicHeaderScrollSync) return;
  window.__publicHeaderScrollSync = true;
  const sync = () => document.documentElement.toggleAttribute(
    "data-public-page-scrolled",
    window.scrollY > 24
  );
  sync();
  requestAnimationFrame(sync);
  window.addEventListener("scroll", sync, { passive: true });
})();`;

/**
 * פס ההטבה הלבן נמצא בראש כל עמוד ציבורי, ולכן גם שורות המערכת מתחילות בלבן.
 * ThemeColorSync מחליף את הצבע בזמן גלילה בהתאם לאזור שנמצא בראש המסך.
 */
export const viewport: Viewport = {
  themeColor: THEME_COLOR.surface,
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
      {/* פועל מיד מה-HTML, עוד לפני hydration, כדי שההדר יגיב לגלילה גם ברשת איטית. */}
      <script dangerouslySetInnerHTML={{ __html: HEADER_SCROLL_INIT_SCRIPT }} />
      <AnnouncementBar />
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <PublicHeader user={user} overlayAtTop />
      </Suspense>
      <main id="main-content" className="flex-1 bg-ink-50">
        {children}
      </main>
      <PublicFooter user={user} />
    </div>
  );
}
