import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { requireRole, homeForRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-dashboard-layout
      data-theme-color={THEME_COLOR.transparent}
      className="flex min-h-[100dvh] flex-col bg-ink-50"
    >
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <ParentHeader />
      </Suspense>
      <main className="container-page w-full py-6">
        <Suspense
          fallback={
            <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
          }
        >
          {children}
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <ParentFooter />
      </Suspense>
    </div>
  );
}

async function ParentHeader() {
  const profile = await requireRole(["parent", "admin"]);
  const user = { full_name: profile.full_name, home: homeForRole(profile.role) };
  return <PublicHeader user={user} withAnnouncementOffset={false} />;
}

async function ParentFooter() {
  const profile = await requireRole(["parent", "admin"]);
  const user = { full_name: profile.full_name, home: homeForRole(profile.role) };
  return <PublicFooter user={user} />;
}
