"use server";

import { getSessionProfile } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, isGenderType } from "@/lib/constants";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";

export type InstructorActionResult = { success: true } | { success: false; error: string };

export type InstructorAccountInput = {
  email: string;
  password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function isCallerAdmin() {
  const profile = await getSessionProfile();
  return profile?.role === "admin";
}

/**
 * יוצר משתמש התחברות ומסמן אותו כמדריכה. טריגר handle_new_user יוצר את הפרופיל
 * ב־public.profiles (תמיד כ"הורה", כדי שלקוח לא יוכל להעניק לעצמו תפקיד),
 * ולכן התפקיד נקבע כאן בנפרד עם מפתח service role.
 */
async function createInstructorAuthUser(input: {
  account: InstructorAccountInput;
  fullName: string;
  phone: string | null;
  gender?: Enums<"gender_type"> | null;
}): Promise<{ success: true; profileId: string } | { success: false; error: string }> {
  if (!isAdminClientConfigured()) {
    return {
      success: false,
      error:
        "יצירת פרטי התחברות אינה מוגדרת בשרת. יש להוסיף את SUPABASE_SERVICE_ROLE_KEY לקובץ ‎.env ולהפעיל מחדש.",
    };
  }

  const email = input.account.email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "כתובת המייל אינה תקינה." };
  }
  if (input.account.password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.account.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone },
  });

  if (error || !data.user) {
    const alreadyExists =
      error?.status === 422 || /already|exists|registered/i.test(error?.message ?? "");
    return {
      success: false,
      error: alreadyExists
        ? "כתובת המייל כבר רשומה במערכת."
        : "יצירת פרטי ההתחברות נכשלה. נסו שוב.",
    };
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({
      role: "instructor",
      ...(input.gender ? { gender: input.gender } : {}),
    })
    .eq("id", data.user.id);

  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { success: false, error: "יצירת פרטי ההתחברות נכשלה. נסו שוב." };
  }

  return { success: true, profileId: data.user.id };
}

export async function createInstructor(input: {
  fullName: string;
  gender: Enums<"gender_type">;
  phone: string | null;
  hourlyRate: number | null;
  account: InstructorAccountInput | null;
}): Promise<InstructorActionResult> {
  if (!(await isCallerAdmin())) {
    return { success: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  const fullName = input.fullName.trim();
  if (!fullName) {
    return { success: false, error: "יש להזין שם מלא." };
  }
  if (!isGenderType(input.gender)) {
    return { success: false, error: "נא לבחור מגדר." };
  }

  const phone = input.phone?.trim() || null;
  let profileId: string | null = null;

  if (input.account) {
    const created = await createInstructorAuthUser({
      account: input.account,
      fullName,
      phone,
      gender: input.gender,
    });
    if (!created.success) return created;
    profileId = created.profileId;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("instructors").insert({
    full_name: fullName,
    gender: input.gender,
    phone,
    hourly_rate: input.hourlyRate,
    status: "active",
    profile_id: profileId,
  });

  if (error) {
    // מוחקים את חשבון ההתחברות שנוצר כדי לא להשאיר משתמש ללא רשומת מדריכה.
    if (profileId) {
      await createAdminClient().auth.admin.deleteUser(profileId);
    }
    return {
      success: false,
      error: "שמירת המדריכה נכשלה. בדקו את הפרטים ונסו שוב.",
    };
  }

  return { success: true };
}

export async function createInstructorAccount(input: {
  instructorId: string;
  account: InstructorAccountInput;
}): Promise<InstructorActionResult> {
  if (!(await isCallerAdmin())) {
    return { success: false, error: "אין לך הרשאה לבצע פעולה זו." };
  }

  const supabase = await createClient();
  const { data: instructor } = await supabase
    .from("instructors")
    .select("id, full_name, phone, profile_id, gender")
    .eq("id", input.instructorId)
    .maybeSingle();

  if (!instructor) {
    return { success: false, error: "המדריכה לא נמצאה." };
  }
  if (instructor.profile_id) {
    return { success: false, error: "למדריכה כבר קיימים פרטי התחברות." };
  }

  const created = await createInstructorAuthUser({
    account: input.account,
    fullName: instructor.full_name,
    phone: instructor.phone,
    gender: instructor.gender,
  });
  if (!created.success) return created;

  const { error } = await supabase
    .from("instructors")
    .update({ profile_id: created.profileId })
    .eq("id", instructor.id);

  if (error) {
    await createAdminClient().auth.admin.deleteUser(created.profileId);
    return {
      success: false,
      error: "שיוך פרטי ההתחברות למדריכה נכשל. נסו שוב.",
    };
  }

  return { success: true };
}
