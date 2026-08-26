import { PageHeader } from "@/components/ui/PageHeader";
import { ClassForm } from "@/components/admin/ClassForm";
import { getClassCategories } from "@/lib/admin/getClassCategories";
import { getClassInstructorOptions } from "@/lib/admin/classInstructors";
import { getDefaultSiblingTiers } from "@/lib/admin/siblingDiscount";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  buildInitialSchedule,
  cloneScheduleForNewClass,
} from "@/lib/scheduling/classSchedule";

export const metadata = { title: "חוג חדש" };

function duplicateTitle(title: string) {
  const base = title.replace(/\s*\(עותק(?: \d+)?\)\s*$/, "").trim();
  return `${base} (עותק)`;
}

export default async function NewClassPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const fromId = from?.trim() || null;

  const [instructors, defaultSiblingTiers, categories, source] =
    await Promise.all([
      getClassInstructorOptions(),
      getDefaultSiblingTiers(),
      getClassCategories(),
      fromId ? loadClassSource(fromId) : Promise.resolve(null),
    ]);

  const duplicating = Boolean(source);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={duplicating ? "שכפול חוג" : "יצירת חוג חדש"}
        description={
          duplicating
            ? `על בסיס «${source!.classItem.title}» — בדקו את הפרטים ושמרו כחוג חדש.`
            : "בחרו חוג רגיל או הרשמת עניין. אפשר לחזור אחורה בכל רגע."
        }
      />
      <ClassForm
        instructors={instructors}
        defaultSiblingTiers={defaultSiblingTiers}
        categories={categories}
        duplicate={duplicating}
        existing={
          source
            ? { ...source.classItem, title: duplicateTitle(source.classItem.title) }
            : undefined
        }
        initialSchedule={
          source ? cloneScheduleForNewClass(source.initialSchedule) : undefined
        }
      />
    </div>
  );
}

async function loadClassSource(id: string) {
  const supabase = await createAdminDataClient();
  const [{ data: classItem }, { data: slots }, { data: sessions }] =
    await Promise.all([
      supabase.from("classes").select("*").eq("id", id).maybeSingle(),
      supabase.from("class_weekly_slots").select("*").eq("class_id", id),
      supabase
        .from("class_sessions")
        .select("*")
        .eq("class_id", id)
        .order("session_date"),
    ]);

  if (!classItem) return null;

  return {
    classItem,
    initialSchedule: buildInitialSchedule(classItem, slots ?? [], sessions ?? []),
  };
}
