import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/components/admin/ClassForm";
import { getClassCategories } from "@/lib/admin/getClassCategories";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { getDefaultSiblingTiers } from "@/lib/admin/siblingDiscount";

export const metadata = { title: "חוג חדש" };

export default async function NewClassPage() {
  const [instructors, defaultSiblingTiers, categories] = await Promise.all([
    getClassInstructorOptions(),
    getDefaultSiblingTiers(),
    getClassCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="יצירת חוג חדש"
        description="ארבעה שלבים קצרים. אפשר לחזור אחורה בכל רגע."
      />
      <ClassForm
        instructors={instructors}
        defaultSiblingTiers={defaultSiblingTiers}
        categories={categories}
      />
    </div>
  );
}
