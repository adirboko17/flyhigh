import { PageHeader } from "@/components/ui/PageHeader";
import { NewClassForm } from "@/components/admin/NewClassForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "חוג חדש" };

export default async function NewClassPage() {
  const supabase = await createClient();
  const { data: instructors } = await supabase
    .from("instructors")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="יצירת חוג חדש"
        description="מלאו את פרטי החוג. ניתן לשמור כטיוטה ולפרסם בהמשך."
      />
      <NewClassForm instructors={instructors ?? []} />
    </div>
  );
}
