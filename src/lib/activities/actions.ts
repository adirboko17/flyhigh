"use server";

import { requireRole } from "@/lib/auth";
import { ACTIVITY_DEFAULT_DURATION_MINUTES } from "@/lib/programs";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type ScheduleActivityInput = {
  bookingId: string;
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

export async function scheduleActivityBookings(input: {
  bookings: ScheduleActivityInput[];
}): Promise<{ success: boolean; error?: string }> {
  await requireRole("admin");
  const bookings = input.bookings ?? [];
  if (bookings.length === 0) {
    return { success: false, error: "נא לבחור לפחות פעילות אחת לתיאום." };
  }

  for (const booking of bookings) {
    if (!isValidDate(booking.sessionDate) || !isValidTime(booking.startTime)) {
      return { success: false, error: "תאריך או שעה לא תקינים." };
    }
  }

  const supabase = await createClient();
  const ids = bookings.map((item) => item.bookingId);

  const { data: rows, error } = await supabase
    .from("activity_bookings")
    .select("id, status")
    .in("id", ids)
    .eq("status", "awaiting_schedule");

  if (error || !rows || rows.length !== ids.length) {
    return {
      success: false,
      error: "חלק מהפעילויות כבר תואמו או לא נמצאו. רעננו ונסו שוב.",
    };
  }

  for (const booking of bookings) {
    const startTime =
      booking.startTime.length === 5
        ? `${booking.startTime}:00`
        : booking.startTime;
    const { error: updateError } = await supabase
      .from("activity_bookings")
      .update({
        status: "scheduled",
        session_date: booking.sessionDate,
        start_time: startTime,
        end_time: addMinutesToTime(
          startTime,
          ACTIVITY_DEFAULT_DURATION_MINUTES
        ),
      })
      .eq("id", booking.bookingId)
      .eq("status", "awaiting_schedule");

    if (updateError) {
      return { success: false, error: "שמירת התיאום נכשלה. נסו שוב." };
    }
  }

  return { success: true };
}

export async function updateActivityBookingStatus(input: {
  bookingId: string;
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
    .from("activity_bookings")
    .update(patch)
    .eq("id", input.bookingId);

  if (error) {
    return { success: false, error: "עדכון הסטטוס נכשל. נסו שוב." };
  }

  return { success: true };
}
