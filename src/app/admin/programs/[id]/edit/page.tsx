import { PageHeader } from "@/components/ui/PageHeader";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "עריכת מסלול" };

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .single();

  if (!program) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="עריכת מסלול" description={program.title} />
      <ProgramForm existing={program} />
    </div>
  );
}
