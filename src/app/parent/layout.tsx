import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { requireRole, homeForRole } from "@/lib/auth";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["parent", "admin"]);
  const user = { full_name: profile.full_name, home: homeForRole(profile.role) };

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <PublicHeader user={user} />
      </Suspense>
      <main className="container-page w-full py-6">{children}</main>
      <PublicFooter user={user} />
    </div>
  );
}
