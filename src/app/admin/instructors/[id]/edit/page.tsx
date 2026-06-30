import { PageHeader } from "@/components/ui/PageHeader";
import { InstructorForm } from "@/components/admin/InstructorForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "עריכת מדריכה" };

export default async function EditInstructorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: instructor } = await supabase
    .from("instructors")
    .select("*")
    .eq("id", id)
    .single();

  if (!instructor) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="עריכת מדריכה" description={instructor.full_name} />
      <InstructorForm existing={instructor} />
    </div>
  );
}
