import { Sidebar } from "@/components/layout/Sidebar";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar
        items={ADMIN_NAV}
        profile={profile}
        logoSrc="/images/alagova-logo-01.png"
        logoHeight={64}
        logoWidth={210}
        logoHref="/admin"
      />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
