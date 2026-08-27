import { ClassOverviewBoard } from "@/components/admin/ClassOverviewBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadClassOverview } from "@/lib/admin/classOverview";

export const metadata = { title: "מבט על חוגים" };

export default async function AdminClassOverviewPage() {
  const data = await loadClassOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="מבט על חוגים"
        description="כל הנרשמים לכל החוגים — לפי חוג, מועד ומדריך"
      />
      <ClassOverviewBoard
        rows={data.rows}
        classes={data.classes}
        slots={data.slots}
        instructors={data.instructors}
      />
    </div>
  );
}
