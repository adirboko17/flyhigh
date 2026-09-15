"use server";

import { revalidatePath } from "next/cache";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { isClassProspectStatus } from "@/lib/constants";
import type { Enums } from "@/types/database.types";

export type ProspectInput = {
  fullName: string;
  phone?: string;
  childName?: string;
  classId: string;
  sessionId: string;
  notes?: string;
  status?: string;
};

export type ProspectSessionOption = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
};

function trim(value: string | undefined) {
  return (value ?? "").trim();
}

function emptyToNull(value: string | undefined) {
  const next = trim(value);
  return next.length > 0 ? next : null;
}

export async function listProspectClassSessions(
  classId: string,
  includeSessionId?: string | null
): Promise<{ sessions: ProspectSessionOption[]; error?: string }> {
  const supabase = await createAdminDataClient();
  const trimmed = trim(classId);
  if (!trimmed) return { sessions: [] };

  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, session_date, start_time, end_time, status")
    .eq("class_id", trimmed)
    .order("session_date")
    .order("start_time");

  if (error) return { sessions: [], error: "טעינת המועדים נכשלה." };

  const includeId = trim(includeSessionId ?? "");
  const sessions = (data ?? [])
    .filter((row) => row.status !== "cancelled" || row.id === includeId)
    .map((row) => ({
      id: row.id,
      session_date: row.session_date,
      start_time: row.start_time,
      end_time: row.end_time,
    }));

  return { sessions };
}

async function resolveSession(input: {
  classId: string;
  sessionId: string;
}): Promise<
  | { error: string; row?: undefined }
  | { error?: undefined; row: { session_id: string; trial_date: string } }
> {
  const classId = trim(input.classId);
  const sessionId = trim(input.sessionId);
  if (!classId) return { error: "נא לבחור חוג." };
  if (!sessionId) return { error: "נא לבחור מועד שיעור ניסיון." };

  const supabase = await createAdminDataClient();
  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, class_id, session_date, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.class_id !== classId) {
    return { error: "המועד שנבחר לא שייך לחוג הזה." };
  }
  if (session.status === "cancelled") {
    return { error: "לא ניתן לשייך מתעניינת למפגש שבוטל." };
  }

  return {
    row: {
      session_id: session.id,
      trial_date: session.session_date,
    },
  };
}

function validateDetails(input: ProspectInput): {
  error?: string;
  row?: {
    full_name: string;
    phone: string | null;
    child_name: string | null;
    class_id: string;
    notes: string | null;
    status: Enums<"class_prospect_status">;
  };
} {
  const fullName = trim(input.fullName);
  const classId = trim(input.classId);
  const status = input.status ?? "scheduled";

  if (fullName.length < 2) return { error: "נא למלא שם." };
  if (!classId) return { error: "נא לבחור חוג." };
  if (!isClassProspectStatus(status)) return { error: "סטטוס לא תקין." };

  return {
    row: {
      full_name: fullName,
      phone: emptyToNull(input.phone),
      child_name: emptyToNull(input.childName),
      class_id: classId,
      notes: emptyToNull(input.notes),
      status,
    },
  };
}

function revalidateProspectPaths() {
  revalidatePath("/admin/prospects");
  revalidatePath("/instructor");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/calendar");
}

export async function saveProspect(
  input: ProspectInput & { id?: string }
): Promise<{ error?: string }> {
  const details = validateDetails(input);
  if (details.error || !details.row) return { error: details.error };

  const session = await resolveSession({
    classId: details.row.class_id,
    sessionId: input.sessionId,
  });
  if (session.error || !session.row) return { error: session.error };

  const supabase = await createAdminDataClient();
  const row = {
    ...details.row,
    session_id: session.row.session_id,
    trial_date: session.row.trial_date,
  };
  const { error } = input.id
    ? await supabase.from("class_prospects").update(row).eq("id", input.id)
    : await supabase.from("class_prospects").insert(row);

  if (error) return { error: "שמירת המתעניינת נכשלה. נסו שוב." };

  revalidateProspectPaths();
  return {};
}

export async function updateProspectStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  if (!isClassProspectStatus(status)) return { error: "סטטוס לא תקין." };

  const supabase = await createAdminDataClient();
  const { error } = await supabase
    .from("class_prospects")
    .update({ status })
    .eq("id", id);

  if (error) return { error: "עדכון הסטטוס נכשל. נסו שוב." };

  revalidateProspectPaths();
  return {};
}

export async function deleteProspect(id: string): Promise<{ error?: string }> {
  const supabase = await createAdminDataClient();
  const { error } = await supabase.from("class_prospects").delete().eq("id", id);

  if (error) return { error: "מחיקת הרשומה נכשלה. נסו שוב." };

  revalidateProspectPaths();
  return {};
}
