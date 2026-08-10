import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/components/admin/ClassForm";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { getDefaultSiblingTiers } from "@/lib/admin/siblingDiscount";

export const metadata = { title: "חוג חדש" };

export default async function NewClassPage() {
  const [instructors, defaultSiblingTiers] = await Promise.all([
    getClassInstructorOptions(),
    getDefaultSiblingTiers(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="יצירת חוג חדש"
        description="מלאו את פרטי החוג. ניתן לשמור כטיוטה ולפרסם בהמשך."
      />
      <ClassForm
        instructors={instructors}
        defaultSiblingTiers={defaultSiblingTiers}
      />
    </div>
  );
}
