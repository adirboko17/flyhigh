import Link from "next/link";
import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PARENT_NAV } from "@/lib/navigation";
import { requireRole, homeForRole } from "@/lib/auth";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["parent", "admin"]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Suspense fallback={<div className="h-16" aria-hidden />}>
        <PublicHeader
          user={{ full_name: profile.full_name, home: homeForRole(profile.role) }}
        />
      </Suspense>
      <div className="container-page w-full py-6">
        <nav className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-card">
          {PARENT_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
      <PublicFooter />
    </div>
  );
}
