"use server";

import { revalidateTag } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { isGenderType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function updateOwnProfile(input: {
  fullName: string;
  phone: string;
  gender: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const profile = await requireProfile();
  const fullName = input.fullName.trim();
  if (!fullName) {
    return { success: false, error: "יש להזין שם מלא." };
  }
  if (!isGenderType(input.gender)) {
    return { success: false, error: "נא לבחור מגדר." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: input.phone.trim() || null,
      gender: input.gender,
    })
    .eq("id", profile.id);

  if (error) {
    return { success: false, error: "אירעה שגיאה בשמירת הפרטים. נסו שוב." };
  }

  revalidateTag(`profile:${profile.id}`);
  return { success: true };
}
