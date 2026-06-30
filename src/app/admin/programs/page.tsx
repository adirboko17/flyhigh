import { ProgramList } from "@/components/admin/ProgramList";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "מסלולים" };

export default async function AdminProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, title, description, price, status")
    .order("created_at", { ascending: false });

  return <ProgramList programs={programs ?? []} />;
}
