import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  syncLegacyClassFields,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";

export async function saveClassSchedule(
  supabase: SupabaseClient<Database>,
  classId: string,
  schedule: ClassScheduleState
): Promise<{ error: string | null }> {
  const { error: deleteSlotsError } = await supabase
    .from("class_weekly_slots")
    .delete()
    .eq("class_id", classId);

  if (deleteSlotsError) {
    return { error: "שמירת לוח הזמנים נכשלה." };
  }

  const { error: deleteSessionsError } = await supabase
    .from("class_sessions")
    .delete()
    .eq("class_id", classId);

  if (deleteSessionsError) {
    return { error: "שמירת לוח הזמנים נכשלה." };
  }

  if (schedule.scheduleType === "weekly" && schedule.weeklySlots.length > 0) {
    const { error: slotsError } = await supabase.from("class_weekly_slots").insert(
      schedule.weeklySlots.map((slot) => ({
        class_id: classId,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
      }))
    );

    if (slotsError) {
      return { error: "שמירת ימי החוג נכשלה." };
    }
  }

  if (schedule.sessions.length > 0) {
    const { error: sessionsError } = await supabase.from("class_sessions").insert(
      schedule.sessions.map((session) => ({
        class_id: classId,
        session_date: session.sessionDate,
        start_time: session.startTime,
        end_time: session.endTime,
        status: session.status,
        notes: session.notes || null,
      }))
    );

    if (sessionsError) {
      return { error: "שמירת המפגשים נכשלה." };
    }
  }

  const legacy = syncLegacyClassFields(
    schedule.scheduleType,
    schedule.weeklySlots,
    schedule.sessions
  );

  const { error: classError } = await supabase
    .from("classes")
    .update(legacy)
    .eq("id", classId);

  if (classError) {
    return { error: "עדכון תאריכי החוג נכשל." };
  }

  return { error: null };
}
