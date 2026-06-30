import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/components/admin/ClassForm";
import { buildInitialSchedule } from "@/lib/scheduling/classSchedule";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "עריכת חוג" };

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: classItem },
    { data: instructors },
    { data: slots },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).single(),
    supabase
      .from("instructors")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
    supabase.from("class_weekly_slots").select("*").eq("class_id", id),
    supabase
      .from("class_sessions")
      .select("*")
      .eq("class_id", id)
      .order("session_date"),
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
        instructors={instructors ?? []}
        existing={classItem}
        initialSchedule={initialSchedule}
      />
    </div>
  );
}
