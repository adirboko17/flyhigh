import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  syncLegacyClassFields,
  weeklySlotKey,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";

function sessionWeekday(sessionDate: string) {
  const [year, month, day] = sessionDate.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export async function saveClassSchedule(
  supabase: SupabaseClient<Database>,
  classId: string,
  schedule: ClassScheduleState
): Promise<{ error: string | null }> {
  const { data: existingSlots, error: loadSlotsError } = await supabase
    .from("class_weekly_slots")
    .select("id, day_of_week, start_time, end_time")
    .eq("class_id", classId);

  if (loadSlotsError) {
    return { error: "שמירת לוח הזמנים נכשלה." };
  }

  const slotIdByKey = new Map<string, string>();

  if (schedule.scheduleType === "weekly") {
    const incoming = schedule.weeklySlots.filter(
      (slot) => slot.startTime.trim() && slot.endTime.trim()
    );
    const unusedExisting = [...(existingSlots ?? [])];

    for (const slot of incoming) {
      const key = weeklySlotKey(slot);
      const byId = slot.id
        ? unusedExisting.find((row) => row.id === slot.id)
        : undefined;
      const byKey = unusedExisting.find(
        (row) =>
          row.day_of_week === slot.dayOfWeek &&
          row.start_time.slice(0, 5) === slot.startTime.slice(0, 5)
      );
      const match = byId ?? byKey;

      if (match) {
        slotIdByKey.set(key, match.id);
        unusedExisting.splice(unusedExisting.indexOf(match), 1);
        const { error: updateError } = await supabase
          .from("class_weekly_slots")
          .update({
            day_of_week: slot.dayOfWeek,
            start_time: slot.startTime,
            end_time: slot.endTime,
            gender_policy: slot.genderPolicy ?? "mixed",
            instructor_id: slot.instructorId || null,
            note: slot.note?.trim() || null,
          })
          .eq("id", match.id);
        if (updateError) {
          return { error: "שמירת ימי החוג נכשלה." };
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("class_weekly_slots")
          .insert({
            class_id: classId,
            day_of_week: slot.dayOfWeek,
            start_time: slot.startTime,
            end_time: slot.endTime,
            gender_policy: slot.genderPolicy ?? "mixed",
            instructor_id: slot.instructorId || null,
            note: slot.note?.trim() || null,
          })
          .select("id")
          .single();
        if (insertError || !inserted) {
          return { error: "שמירת ימי החוג נכשלה." };
        }
        slotIdByKey.set(key, inserted.id);
      }
    }

    const removable = unusedExisting.map((row) => row.id);
    if (removable.length > 0) {
      const { count: enrolledOnRemoved } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .in("weekly_slot_id", removable)
        .neq("status", "cancelled");

      if ((enrolledOnRemoved ?? 0) > 0) {
        return {
          error: "לא ניתן למחוק מועד שיש בו נרשמים. העבירו אותם למועד אחר קודם.",
        };
      }

      const { error: deleteUnusedError } = await supabase
        .from("class_weekly_slots")
        .delete()
        .in("id", removable);
      if (deleteUnusedError) {
        return { error: "שמירת ימי החוג נכשלה." };
      }
    }
  } else if ((existingSlots ?? []).length > 0) {
    const existingIds = (existingSlots ?? []).map((row) => row.id);
    const { count: enrolledOnSlots } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("weekly_slot_id", existingIds)
      .neq("status", "cancelled");

    if ((enrolledOnSlots ?? 0) > 0) {
      return {
        error: "לא ניתן לעבור לתאריכים מותאמים כשיש נרשמים למועד מסוים.",
      };
    }

    const { error: deleteSlotsError } = await supabase
      .from("class_weekly_slots")
      .delete()
      .eq("class_id", classId);
    if (deleteSlotsError) {
      return { error: "שמירת לוח הזמנים נכשלה." };
    }
  }

  const { data: previousSessions } = await supabase
    .from("class_sessions")
    .select("session_date, start_time, substitute_instructor_id")
    .eq("class_id", classId)
    .not("substitute_instructor_id", "is", null);

  const substituteBySlot = new Map(
    (previousSessions ?? []).map((session) => [
      `${session.session_date}|${session.start_time.slice(0, 5)}`,
      session.substitute_instructor_id,
    ])
  );

  const { error: deleteSessionsError } = await supabase
    .from("class_sessions")
    .delete()
    .eq("class_id", classId);

  if (deleteSessionsError) {
    return { error: "שמירת לוח הזמנים נכשלה." };
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
        weekly_slot_id:
          slotIdByKey.get(
            weeklySlotKey({
              dayOfWeek: sessionWeekday(session.sessionDate),
              startTime: session.startTime,
            })
          ) ?? null,
        substitute_instructor_id:
          substituteBySlot.get(
            `${session.sessionDate}|${session.startTime.slice(0, 5)}`
          ) ?? null,
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
