"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  isClassWaitlistRequestStatus,
  isClassWaitlistSkillLevel,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type ClassWaitlistRequestInput = {
  fullName: string;
  phone: string;
  childName: string;
  childAge: string;
  childGender: string;
  skillLevel: string;
  desiredClassName: string;
  preferredTimes: string;
  website?: string;
};

function trim(value: string | undefined) {
  return (value ?? "").trim();
}

function parseChildAge(value: string): number | null {
  const age = Number.parseInt(value, 10);
  if (!Number.isInteger(age) || age < 1 || age > 21) return null;
  return age;
}

function isChildGender(
  value: string
): value is Extract<Enums<"gender_type">, "male" | "female"> {
  return value === "male" || value === "female";
}

export async function submitClassWaitlistRequest(
  input: ClassWaitlistRequestInput
): Promise<{ success: boolean; error?: string }> {
  if (trim(input.website)) {
    return { success: true };
  }

  const fullName = trim(input.fullName);
  const phone = trim(input.phone);
  const childName = trim(input.childName);
  const desiredClassName = trim(input.desiredClassName);
  const preferredTimes = trim(input.preferredTimes);
  const childAge = parseChildAge(input.childAge);

  if (fullName.length < 2) return { success: false, error: "נא למלא שם מלא." };
  if (phone.length < 9) return { success: false, error: "נא למלא מספר טלפון." };
  if (childName.length < 2) {
    return { success: false, error: "נא למלא את שם הילד או הילדה." };
  }
  if (childAge == null) {
    return { success: false, error: "נא למלא גיל בין 1 ל־21." };
  }
  if (!isChildGender(input.childGender)) {
    return { success: false, error: "נא לבחור מגדר." };
  }
  if (!isClassWaitlistSkillLevel(input.skillLevel)) {
    return { success: false, error: "נא לבחור רמה — מתחילים או מתקדמים." };
  }
  if (desiredClassName.length < 2) {
    return { success: false, error: "נא לכתוב איזה חוג תרצו." };
  }
  if (preferredTimes.length < 2) {
    return { success: false, error: "נא לכתוב אילו מועדים מתאימים לכם." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("class_waitlist_requests").insert({
    full_name: fullName,
    phone,
    child_name: childName,
    child_age: childAge,
    child_gender: input.childGender,
    skill_level: input.skillLevel,
    desired_class_name: desiredClassName,
    preferred_times: preferredTimes,
    status: "pending",
  });

  if (error) {
    return { success: false, error: "לא הצלחנו לשמור את הפנייה. נסו שוב." };
  }

  revalidatePath("/admin/waitlist-requests");
  return { success: true };
}

export async function updateClassWaitlistRequestStatus(
  id: string,
  status: string
): Promise<{ error?: string }> {
  await requireRole("admin");
  if (!isClassWaitlistRequestStatus(status)) {
    return { error: "סטטוס לא תקין." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_waitlist_requests")
    .update({ status })
    .eq("id", id);

  if (error) return { error: "עדכון הסטטוס נכשל. נסו שוב." };

  revalidatePath("/admin/waitlist-requests");
  return {};
}

export async function deleteClassWaitlistRequest(
  id: string
): Promise<{ error?: string }> {
  await requireRole("admin");

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_waitlist_requests")
    .delete()
    .eq("id", id);

  if (error) return { error: "מחיקת הפנייה נכשלה. נסו שוב." };

  revalidatePath("/admin/waitlist-requests");
  return {};
}
