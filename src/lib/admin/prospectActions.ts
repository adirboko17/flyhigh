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
  trialDate: string;
  notes?: string;
  status?: string;
};

function trim(value: string | undefined) {
  return (value ?? "").trim();
}

function emptyToNull(value: string | undefined) {
  const next = trim(value);
  return next.length > 0 ? next : null;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateInput(input: ProspectInput): {
  error?: string;
  row?: {
    full_name: string;
    phone: string | null;
    child_name: string | null;
    class_id: string;
    trial_date: string;
    notes: string | null;
    status: Enums<"class_prospect_status">;
  };
} {
  const fullName = trim(input.fullName);
  const classId = trim(input.classId);
  const trialDate = trim(input.trialDate);
  const status = input.status ?? "scheduled";

  if (fullName.length < 2) return { error: "נא למלא שם." };
  if (!classId) return { error: "נא לבחור חוג." };
  if (!isIsoDate(trialDate)) return { error: "נא לבחור מועד ניסיון." };
  if (!isClassProspectStatus(status)) return { error: "סטטוס לא תקין." };

  return {
    row: {
      full_name: fullName,
      phone: emptyToNull(input.phone),
      child_name: emptyToNull(input.childName),
      class_id: classId,
      trial_date: trialDate,
      notes: emptyToNull(input.notes),
      status,
    },
  };
}

export async function saveProspect(
  input: ProspectInput & { id?: string }
): Promise<{ error?: string }> {
  const parsed = validateInput(input);
  if (parsed.error || !parsed.row) return { error: parsed.error };

  const supabase = await createAdminDataClient();
  const { error } = input.id
    ? await supabase
        .from("class_prospects")
        .update(parsed.row)
        .eq("id", input.id)
    : await supabase.from("class_prospects").insert(parsed.row);

  if (error) return { error: "שמירת המתעניינת נכשלה. נסו שוב." };

  revalidatePath("/admin/prospects");
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

  revalidatePath("/admin/prospects");
  return {};
}

export async function deleteProspect(id: string): Promise<{ error?: string }> {
  const supabase = await createAdminDataClient();
  const { error } = await supabase.from("class_prospects").delete().eq("id", id);

  if (error) return { error: "מחיקת הרשומה נכשלה. נסו שוב." };

  revalidatePath("/admin/prospects");
  return {};
}
