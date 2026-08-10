import { InstructorDocumentsPanel } from "@/components/instructors/InstructorDocumentsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentInstructor, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "המסמכים שלי" };

export default async function InstructorDocumentsPage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  if (!instructor) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="המסמכים שלי"
          description="מסמכי העסקה שהועלו עבורך על ידי ההנהלה"
        />
        <EmptyState
          title="לא נמצא פרופיל מדריכה"
          description="אין רשומת מדריכה משויכת לחשבון זה."
        />
      </div>
    );
  }

  const { data: documents } = await supabase
    .from("instructor_documents")
    .select(
      "id, title, category, file_name, file_path, file_size, mime_type, notes, created_at"
    )
    .eq("instructor_id", instructor.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="המסמכים שלי"
        description="מסמכי העסקה שהועלו עבורך על ידי ההנהלה"
      />

      <InstructorDocumentsPanel
        instructorId={instructor.id}
        documents={documents ?? []}
        canManage={false}
        emptyDescription="עדיין לא הועלו מסמכים עבורך. כשיועלו — הם יופיעו כאן."
      />
    </div>
  );
}
