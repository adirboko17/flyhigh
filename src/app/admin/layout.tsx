import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ADMIN_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <div className="flex min-h-screen bg-ink-50 lg:flex-row-reverse">
      <Sidebar items={ADMIN_NAV} area="אזור ניהול" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
