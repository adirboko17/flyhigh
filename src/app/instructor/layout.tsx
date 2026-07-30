import { Sidebar } from "@/components/layout/Sidebar";
import { INSTRUCTOR_NAV } from "@/lib/navigation";
import { requireRole } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["instructor", "admin"]);

  return (
    <div
      data-dashboard-layout
      data-theme-color={THEME_COLOR.transparent}
      className="flex min-h-[100dvh] flex-col bg-ink-50 lg:flex-row"
    >
      <Sidebar items={INSTRUCTOR_NAV} area="אזור מדריכה" profile={profile} />
      <main className="w-full min-w-0 p-4 sm:p-6 lg:flex-1 lg:p-8">
        {children}
      </main>
    </div>
  );
}
