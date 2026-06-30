import { Sidebar } from "@/components/layout/Sidebar";
import { INSTRUCTOR_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["instructor", "admin"]);

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar items={INSTRUCTOR_NAV} area="אזור מדריכה" profile={profile} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
