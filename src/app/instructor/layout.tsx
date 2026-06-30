import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { INSTRUCTOR_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["instructor", "admin"]);

  return (
    <div className="flex min-h-screen bg-ink-50 lg:flex-row-reverse">
      <Sidebar items={INSTRUCTOR_NAV} area="אזור מדריכה" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
