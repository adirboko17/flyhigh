"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * שיוך מדריכה מחליפה למפגשים בודדים. מדריכה קבועה נשארת משויכת לחוג —
 * ההחלפה נרשמת ברמת המפגש בלבד, וממנה נגזר גם חישוב השכר.
 * הפעולה שמורה למנהל בלבד, גם ברמת מדיניות הגישה במסד הנתונים.
 */
export async function setSessionSubstitute(input: {
  sessionIds: string[];
  /** null מבטל את ההחלפה ומחזיר את המדריכה הקבועה. */
  instructorId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");

  const sessionIds = [...new Set(input.sessionIds.filter(Boolean))];
  if (sessionIds.length === 0) {
    return { success: false, error: "לא נבחרו מפגשים." };
  }

  const supabase = await createClient();

  if (input.instructorId) {
    const { data: instructor } = await supabase
      .from("instructors")
      .select("id, status")
      .eq("id", input.instructorId)
      .maybeSingle();

    if (!instructor) {
      return { success: false, error: "המדריכה שנבחרה לא נמצאה." };
    }
    if (instructor.status !== "active") {
      return { success: false, error: "לא ניתן לשבץ מדריכה שאינה פעילה." };
    }
  }

  const { error } = await supabase
    .from("class_sessions")
    .update({ substitute_instructor_id: input.instructorId })
    .in("id", sessionIds);

  if (error) {
    return { success: false, error: "שמירת ההחלפה נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/calendar");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/finance");
  revalidatePath("/instructor");
  revalidatePath("/instructor/payroll");

  return { success: true };
}
