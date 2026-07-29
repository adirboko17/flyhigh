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
    <div className="flex min-h-screen flex-col bg-ink-50 lg:flex-row">
      <Sidebar items={INSTRUCTOR_NAV} area="אזור מדריכה" profile={profile} />
      <main className="w-full min-w-0 p-4 sm:p-6 lg:flex-1 lg:p-8">
        {children}
      </main>
    </div>
  );
}
