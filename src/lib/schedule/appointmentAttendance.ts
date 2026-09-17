"use server";

import { getCurrentInstructor, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentKind } from "@/lib/schedule/kinds";
import type { Enums } from "@/types/database.types";

export type { AppointmentKind };

export async function markAppointmentAttendance(input: {
  kind: AppointmentKind;
  id: string;
  status: Enums<"attendance_status"> | null;
}): Promise<{ success: boolean; error?: string }> {
  const profile = await requireRole(["admin", "instructor"]);
  if (profile.role !== "admin") {
    const instructor = await getCurrentInstructor();
    if (!instructor) {
      return { success: false, error: "לא נמצאה רשומת מדריכה לחשבון הזה." };
    }
  }

  const supabase = await createClient();
  const patch = { attendance_status: input.status };

  const result =
    input.kind === "private_lesson"
      ? await supabase
          .from("private_lesson_slots")
          .update(patch)
          .eq("id", input.id)
          .eq("status", "scheduled")
          .select("id")
          .maybeSingle()
      : input.kind === "activity"
        ? await supabase
            .from("activity_bookings")
            .update(patch)
            .eq("id", input.id)
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle()
        : await supabase
            .from("pool_pass_bookings")
            .update(patch)
            .eq("id", input.id)
            .eq("status", "scheduled")
            .select("id")
            .maybeSingle();

  if (result.error || !result.data) {
    return {
      success: false,
      error: "המועד לא נמצא או שאינו משויך אליכם.",
    };
  }

  return { success: true };
}
