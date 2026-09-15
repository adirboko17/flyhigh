"use server";

import { revalidatePath } from "next/cache";
import { getCurrentInstructor, requireRole } from "@/lib/auth";
import { isClassProspectStatus } from "@/lib/constants";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type AttendanceProspect = {
  id: string;
  full_name: string;
  child_name: string | null;
  session_id: string | null;
  trial_date: string;
  status: Enums<"class_prospect_status">;
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

export async function listAttendanceProspects(
  classId: string
): Promise<{ prospects: AttendanceProspect[]; error?: string }> {
  const access = await ensureStaffClassAccess(classId);
  if (access.error) return { prospects: [], error: access.error };

  const supabase = await staffClient();
  const { data, error } = await supabase
    .from("class_prospects")
    .select("id, full_name, child_name, session_id, trial_date, status")
    .eq("class_id", classId)
    .neq("status", "cancelled")
    .order("full_name");

  if (error) return { prospects: [], error: "טעינת המתעניינים נכשלה." };
  return { prospects: (data ?? []) as AttendanceProspect[] };
}

export async function saveProspectAttendanceMarks(input: {
  classId: string;
  marks: Array<{ id: string; status: "arrived" | "no_show" | "scheduled" }>;
}): Promise<{ error?: string }> {
  const access = await ensureStaffClassAccess(input.classId);
  if (access.error) return { error: access.error };
  if (input.marks.length === 0) return {};

  for (const mark of input.marks) {
    if (!isClassProspectStatus(mark.status)) {
      return { error: "סטטוס לא תקין." };
    }
    if (
      mark.status !== "arrived" &&
      mark.status !== "no_show" &&
      mark.status !== "scheduled"
    ) {
      return { error: "סטטוס לא תקין." };
    }
  }

  const supabase = await staffClient();
  const ids = input.marks.map((mark) => mark.id);
  const { data: rows, error: loadError } = await supabase
    .from("class_prospects")
    .select("id")
    .eq("class_id", input.classId)
    .in("id", ids);

  if (loadError) return { error: "שמירת נוכחות המתעניינים נכשלה." };
  if ((rows ?? []).length !== ids.length) {
    return { error: "חלק מהמתעניינים לא שייכים לחוג הזה." };
  }

  const updates = await Promise.all(
    input.marks.map((mark) =>
      supabase
        .from("class_prospects")
        .update({ status: mark.status })
        .eq("id", mark.id)
        .eq("class_id", input.classId)
    )
  );

  if (updates.some((result) => result.error)) {
    return { error: "שמירת נוכחות המתעניינים נכשלה." };
  }

  revalidatePath("/admin/prospects");
  revalidatePath("/instructor");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/calendar");
  return {};
}
