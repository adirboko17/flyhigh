import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/components/admin/ClassForm";
import { getClassCategories } from "@/lib/admin/getClassCategories";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { buildInitialSchedule } from "@/lib/scheduling/classSchedule";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { notFound } from "next/navigation";

export const metadata = { title: "עריכת חוג" };

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createAdminDataClient();

  const [
    { data: classItem },
    instructors,
    { data: slots },
    { data: sessions },
    categories,
  ] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).single(),
    getClassInstructorOptions(),
    supabase.from("class_weekly_slots").select("*").eq("class_id", id),
    supabase
      .from("class_sessions")
      .select("*")
      .eq("class_id", id)
      .order("session_date"),
    getClassCategories(),
  ]);

  if (!classItem) notFound();

  const initialSchedule = buildInitialSchedule(
    classItem,
    slots ?? [],
    sessions ?? []
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="עריכת חוג" description={classItem.title} />
      <ClassForm
        instructors={instructors}
        existing={classItem}
        initialSchedule={initialSchedule}
        categories={categories}
      />
    </div>
  );
}
