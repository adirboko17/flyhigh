"use server";

import { revalidatePath } from "next/cache";
import { getCurrentInstructor, requireRole } from "@/lib/auth";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";
import {
  parseVisitStatus,
  type ProspectVisitMark,
} from "@/lib/attendance/prospectSchedule";

export type AttendanceProspect = {
  id: string;
  full_name: string;
  child_name: string | null;
  session_id: string | null;
  trial_date: string;
  status: Enums<"class_prospect_status">;
  weekly_slot_id: string | null;
  visits: ProspectVisitMark[];
};

async function staffClient() {
  return isAdminClientConfigured() ? createAdminClient() : createClient();
}

async function ensureStaffClassAccess(
  classId: string
): Promise<{ error?: string }> {
  const profile = await requireRole(["admin", "instructor"]);
  if (profile.role === "admin") return {};

  const instructor = await getCurrentInstructor();
  if (!instructor) return { error: "אין הרשאה." };

  const supabase = await staffClient();
  const [{ data: cls }, { data: slot }, { data: substitute }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, instructor_id")
        .eq("id", classId)
        .maybeSingle(),
      supabase
        .from("class_weekly_slots")
        .select("id")
        .eq("class_id", classId)
        .eq("instructor_id", instructor.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("class_sessions")
        .select("id")
        .eq("class_id", classId)
        .eq("substitute_instructor_id", instructor.id)
        .limit(1)
        .maybeSingle(),
    ]);

  if (!cls) return { error: "החוג לא נמצא." };
  if (cls.instructor_id === instructor.id || slot || substitute) return {};
  return { error: "אין הרשאה לחוג זה." };
}

function revalidateProspectPaths() {
  revalidatePath("/admin/prospects");
  revalidatePath("/instructor");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/calendar");
}

export async function listAttendanceProspects(
  classId: string
): Promise<{ prospects: AttendanceProspect[]; error?: string }> {
  const access = await ensureStaffClassAccess(classId);
  if (access.error) return { prospects: [], error: access.error };

  const supabase = await staffClient();
  const { data, error } = await supabase
    .from("class_prospects")
    .select(
      "id, full_name, child_name, session_id, trial_date, status, class_sessions(weekly_slot_id)"
    )
    .eq("class_id", classId)
    .neq("status", "cancelled")
    .order("full_name");

  if (error) return { prospects: [], error: "טעינת המתעניינים נכשלה." };

  const rows = (data ?? []) as Array<{
    id: string;
    full_name: string;
    child_name: string | null;
    session_id: string | null;
    trial_date: string;
    status: Enums<"class_prospect_status">;
    class_sessions: { weekly_slot_id: string | null } | null;
  }>;
  const visitsByProspect = await loadVisits(
    supabase,
    rows.map((row) => row.id)
  );

  return {
    prospects: rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      child_name: row.child_name,
      session_id: row.session_id,
      trial_date: row.trial_date,
      status: row.status,
      weekly_slot_id: row.class_sessions?.weekly_slot_id ?? null,
      visits: visitsByProspect.get(row.id) ?? [],
    })),
  };
}

async function loadVisits(
  supabase: Awaited<ReturnType<typeof staffClient>>,
  prospectIds: string[]
) {
  const visitsByProspect = new Map<string, ProspectVisitMark[]>();
  if (prospectIds.length === 0) return visitsByProspect;

  const { data } = await supabase
    .from("prospect_visits")
    .select("prospect_id, session_id, status")
    .in("prospect_id", prospectIds);

  for (const row of data ?? []) {
    const status = parseVisitStatus(row.status);
    if (!status) continue;
    const list = visitsByProspect.get(row.prospect_id) ?? [];
    list.push({ session_id: row.session_id, status });
    visitsByProspect.set(row.prospect_id, list);
  }
  return visitsByProspect;
}

export async function saveProspectAttendanceMarks(input: {
  classId: string;
  sessionId: string;
  marks: Array<{ id: string; status: "arrived" | "no_show" | "scheduled" }>;
}): Promise<{ error?: string }> {
  const access = await ensureStaffClassAccess(input.classId);
  if (access.error) return { error: access.error };
  if (input.marks.length === 0) return {};
  if (!input.sessionId) return { error: "חסר מפגש לסימון." };

  for (const mark of input.marks) {
    if (
      mark.status !== "arrived" &&
      mark.status !== "no_show" &&
      mark.status !== "scheduled"
    ) {
      return { error: "סטטוס לא תקין." };
    }
  }

  const supabase = await staffClient();
  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, class_id, status")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!session || session.class_id !== input.classId || session.status === "cancelled") {
    return { error: "המפגש לא שייך לחוג הזה." };
  }

  const ids = input.marks.map((mark) => mark.id);
  const { data: rows, error: loadError } = await supabase
    .from("class_prospects")
    .select("id")
    .eq("class_id", input.classId)
    .neq("status", "cancelled")
    .in("id", ids);

  if (loadError) return { error: "שמירת נוכחות המתעניינים נכשלה." };
  if ((rows ?? []).length !== ids.length) {
    return { error: "חלק מהמתעניינים לא שייכים לחוג הזה." };
  }

  const clearIds = input.marks
    .filter((mark) => mark.status === "scheduled")
    .map((mark) => mark.id);
  const upserts = input.marks
    .filter(
      (mark): mark is { id: string; status: "arrived" | "no_show" } =>
        mark.status === "arrived" || mark.status === "no_show"
    )
    .map((mark) => ({
      prospect_id: mark.id,
      session_id: input.sessionId,
      status: mark.status,
    }));

  if (clearIds.length > 0) {
    const { error } = await supabase
      .from("prospect_visits")
      .delete()
      .eq("session_id", input.sessionId)
      .in("prospect_id", clearIds);
    if (error) return { error: "שמירת נוכחות המתעניינים נכשלה." };
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("prospect_visits")
      .upsert(upserts, { onConflict: "prospect_id,session_id" });
    if (error) return { error: "שמירת נוכחות המתעניינים נכשלה." };
  }

  revalidateProspectPaths();
  return {};
}

export async function recordProspectVisit(input: {
  prospectId: string;
  sessionId: string;
  status: "arrived" | "no_show" | "scheduled";
}): Promise<{ error?: string }> {
  await requireRole(["admin", "instructor"]);
  const supabase = await staffClient();
  const { data: prospect } = await supabase
    .from("class_prospects")
    .select("id, class_id, status")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!prospect) return { error: "המתעניינת לא נמצאה." };
  if (prospect.status === "cancelled") {
    return { error: "המתעניינת כבר הוסרה מהרשימה." };
  }

  return saveProspectAttendanceMarks({
    classId: prospect.class_id,
    sessionId: input.sessionId,
    marks: [{ id: prospect.id, status: input.status }],
  });
}

export async function dismissProspect(input: {
  classId: string;
  prospectId: string;
}): Promise<{ error?: string }> {
  const access = await ensureStaffClassAccess(input.classId);
  if (access.error) return { error: access.error };

  const supabase = await staffClient();
  const { error } = await supabase
    .from("class_prospects")
    .update({ status: "cancelled" })
    .eq("id", input.prospectId)
    .eq("class_id", input.classId);

  if (error) return { error: "ההורדה מהרשימה נכשלה. נסו שוב." };

  revalidateProspectPaths();
  return {};
}
