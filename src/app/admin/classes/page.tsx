import { ClassList } from "@/components/admin/ClassList";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "ניהול חוגים" };

export default async function AdminClassesPage() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, title, category, day_of_week, start_time, price, capacity, status, instructors(full_name)")
    .order("created_at", { ascending: false });

  return <ClassList classes={classes ?? []} />;
}
