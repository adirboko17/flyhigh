import { PageHeader } from "@/components/ui/PageHeader";
import { PoolPassForm } from "@/components/admin/PoolPassForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = { title: "עריכת כניסה לבריכה" };

export default async function EditPoolPassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pass } = await supabase
    .from("pool_passes")
    .select("*")
    .eq("id", id)
    .single();

  if (!pass) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="עריכת כניסה לבריכה" description={pass.title} />
      <PoolPassForm existing={pass} />
    </div>
  );
}
