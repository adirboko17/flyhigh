import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { isElapsedClassSession } from "@/lib/finance/proratedClassPrice";
import type { Database } from "@/types/database.types";

export type AppointmentSession = {
  id: string;
  class_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  weekly_slot_id: string | null;
};

export function uniqueSessionIds(ids: string[] | null | undefined): string[] {
  return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
}

export function isUniqueSessionViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function loadBookableAppointmentSessions(
  supabase: SupabaseClient<Database>,
  classId: string,
  sessionIds: string[]
): Promise<{ sessions: AppointmentSession[] } | { error: string }> {
  const ids = uniqueSessionIds(sessionIds);
  if (ids.length === 0) {
    return { error: "נא לבחור לפחות תור אחד." };
  }

  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select("id, class_id, session_date, start_time, end_time, status, weekly_slot_id")
    .eq("class_id", classId)
    .in("id", ids);

  if (error || !sessions || sessions.length !== ids.length) {
    return { error: "אחד או יותר מהתורים שנבחרו אינם תקינים." };
  }

  const today = todayInIsrael();
  for (const session of sessions) {
    if (session.status !== "scheduled") {
      return { error: "אחד מהתורים שנבחרו אינו זמין." };
    }
    if (isElapsedClassSession(session, today)) {
      return { error: "לא ניתן לקבוע תור שכבר עבר." };
    }
  }

  const { data: taken } = await supabase
    .from("enrollments")
    .select("session_id")
    .in("session_id", ids)
    .in("status", ["active", "pending"]);

  if ((taken ?? []).length > 0) {
    return { error: "אחד מהתורים כבר תפוס. רעננו ובחרו תור אחר." };
  }

  return {
    sessions: [...sessions].sort(
      (a, b) =>
        a.session_date.localeCompare(b.session_date) ||
        a.start_time.localeCompare(b.start_time)
    ),
  };
}
