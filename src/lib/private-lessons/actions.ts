"use server";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type ScheduleSlotInput = {
  slotId: string;
  sessionDate: string;
  startTime: string;
};

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function addMinutesToTime(startTime: string, minutes: number) {
  const [h, m, s] = startTime.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const endS = Number.isFinite(s) ? s : 0;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:${String(endS).padStart(2, "0")}`;
}

export async function schedulePrivateLessonSlots(input: {
  slots: ScheduleSlotInput[];
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");
  const slots = input.slots ?? [];
  if (slots.length === 0) {
    return { success: false, error: "נא לבחור לפחות שיעור אחד לתיאום." };
  }

  for (const slot of slots) {
    if (!isValidDate(slot.sessionDate) || !isValidTime(slot.startTime)) {
      return { success: false, error: "תאריך או שעה לא תקינים." };
    }
  }

  const supabase = await createClient();
  const ids = slots.map((s) => s.slotId);

  const { data: rows, error } = await supabase
    .from("private_lesson_slots")
    .select("id, status, private_lessons(duration_minutes)")
    .in("id", ids)
    .in("status", ["awaiting_schedule", "scheduled"]);

  if (error || !rows || rows.length !== ids.length) {
    return {
      success: false,
      error: "חלק מהשיעורים לא נמצאו או כבר בוטלו. רעננו ונסו שוב.",
    };
  }

  const durationById = new Map(
    rows.map((row) => [
      row.id,
      Number(
        (row.private_lessons as { duration_minutes: number } | null)
          ?.duration_minutes ?? 45
      ),
    ])
  );

  for (const slot of slots) {
    const duration = durationById.get(slot.slotId) ?? 45;
    const startTime =
      slot.startTime.length === 5 ? `${slot.startTime}:00` : slot.startTime;
    const { error: updateError } = await supabase
      .from("private_lesson_slots")
      .update({
        status: "scheduled",
        session_date: slot.sessionDate,
        start_time: startTime,
        end_time: addMinutesToTime(startTime, duration),
      })
      .eq("id", slot.slotId)
      .in("status", ["awaiting_schedule", "scheduled"]);

    if (updateError) {
      return { success: false, error: "שמירת התיאום נכשלה. נסו שוב." };
    }
  }

  return { success: true };
}

export async function updatePrivateLessonSlotStatus(input: {
  slotId: string;
  status: Extract<
    Enums<"private_lesson_slot_status">,
    "cancelled" | "completed" | "awaiting_schedule"
  >;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");
  const supabase = await createClient();

  const patch =
    input.status === "awaiting_schedule"
      ? {
          status: input.status,
          session_date: null,
          start_time: null,
          end_time: null,
        }
      : { status: input.status };

  const { error } = await supabase
    .from("private_lesson_slots")
    .update(patch)
    .eq("id", input.slotId);

  if (error) {
    return { success: false, error: "עדכון הסטטוס נכשל. נסו שוב." };
  }

  return { success: true };
}
