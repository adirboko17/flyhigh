import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { INSTRUCTOR_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

export default function InstructorLayout({
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
        <InstructorSidebar />
      </Suspense>
      <main className="w-full min-w-0 p-4 sm:p-6 lg:flex-1 lg:p-8">
        <Suspense fallback={<InstructorLoadingFallback />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function InstructorSidebar() {
  const profile = await requireRole(["instructor", "admin"]);
  return (
    <Sidebar items={INSTRUCTOR_NAV} area="אזור מדריכה" profile={profile} />
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

function InstructorLoadingFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="טוען">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-ink-100" />
      <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
      <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
    </div>
  );
}
