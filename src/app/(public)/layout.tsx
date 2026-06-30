import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getSessionProfile, homeForRole } from "@/lib/auth";

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
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <PublicHeader user={user} overlayAtTop />
      </Suspense>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
