import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import AdminLoading from "./loading";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

/**
 * Layout סינכרוני: ה־shell וה־Suspense סביב העמוד מוצגים מיד.
 * בלי זה await על requireRole היה חוסם את כל העמוד — כולל loading.tsx —
 * עד שהפרופיל חוזר, והמעבר הרגיש "תקוע".
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-dashboard-layout
      data-theme-color={THEME_COLOR.transparent}
      className="flex min-h-[100dvh] flex-col bg-ink-50 lg:flex-row"
    >
      <Suspense fallback={<SidebarFallback />}>
        <AdminSidebar />
      </Suspense>
      <main className="w-full min-w-0 p-4 sm:p-6 lg:flex-1 lg:p-8">
        <Suspense fallback={<AdminLoading />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function AdminSidebar() {
  const profile = await requireRole("admin");

  return (
    <Sidebar
      items={ADMIN_NAV}
      profile={profile}
      logoSrc="/images/alagova-logo-01.png"
      logoHeight={64}
      logoWidth={210}
      logoHref="/admin"
    />
  );
}

function SidebarFallback() {
  return (
    <>
      <div className="sticky top-0 z-50 h-[calc(4rem+env(safe-area-inset-top,0px))] border-b border-ink-100 bg-white lg:hidden" />
      <aside
        aria-hidden
        className="hidden w-72 shrink-0 border-e border-ink-100 bg-white lg:block"
      />
    </>
  );
}
