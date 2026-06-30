import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceMarker } from "@/components/instructor/AttendanceMarker";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";

export const metadata = { title: "סימון נוכחות" };

export default async function InstructorAttendancePage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  if (!instructor) {
    return (
      <div className="space-y-6">
        <PageHeader title="סימון נוכחות" />
        <EmptyState title="לא נמצאה רשומת מדריכה עבורך" icon="✅" />
      </div>
    );
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id, title")
    .eq("instructor_id", instructor.id)
    .order("title");

  const classIds = (classes ?? []).map((c) => c.id);

  const { data: enrollments } =
    classIds.length > 0
      ? await supabase
          .from("enrollments")
          .select("class_id, children(id, full_name)")
          .in("class_id", classIds)
          .eq("status", "active")
      : { data: [] };

  const classOptions = (classes ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    children: (enrollments ?? [])
      .filter((e) => e.class_id === c.id && e.children)
      .map((e) => ({
        id: e.children!.id,
        full_name: e.children!.full_name,
      })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="סימון נוכחות"
        description="בחרו חוג ותאריך וסמנו נוכחות לכל תלמיד"
      />
      <AttendanceMarker classes={classOptions} instructorId={instructor.id} />
    </div>
  );
}
