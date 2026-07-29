"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/constants";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminUserActionResult =
  | { success: true }
  | { success: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdminCaller() {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { ok: false as const, error: "אין לך הרשאה לבצע פעולה זו." };
  }
  return { ok: true as const, profile };
}

export async function createAdminUser(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AdminUserActionResult> {
  const caller = await requireAdminCaller();
  if (!caller.ok) return { success: false, error: caller.error };

  if (!isAdminClientConfigured()) {
    return {
      success: false,
      error:
        "יצירת משתמשי ניהול אינה מוגדרת בשרת. יש להוסיף את SUPABASE_SERVICE_ROLE_KEY לקובץ ‎.env ולהפעיל מחדש.",
    };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!fullName) {
    return { success: false, error: "יש להזין שם מלא." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: "כתובת המייל אינה תקינה." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.`,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const alreadyExists =
      error?.status === 422 || /already|exists|registered/i.test(error?.message ?? "");
    return {
      success: false,
      error: alreadyExists
        ? "כתובת המייל כבר רשומה במערכת."
        : "יצירת משתמש הניהול נכשלה. נסו שוב.",
    };
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({
      role: "admin",
      full_name: fullName,
      email,
      is_primary_admin: false,
    })
    .eq("id", data.user.id);

  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { success: false, error: "יצירת משתמש הניהול נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function removeAdminUser(input: {
  profileId: string;
}): Promise<AdminUserActionResult> {
  const caller = await requireAdminCaller();
  if (!caller.ok) return { success: false, error: caller.error };

  if (caller.profile.id === input.profileId) {
    return { success: false, error: "לא ניתן להסיר את המשתמש המחובר." };
  }

  if (!caller.profile.is_primary_admin) {
    return {
      success: false,
      error: "רק מנהל/ת ראשי/ת יכול/ה להסיר משתמשי ניהול.",
    };
  }

  if (!isAdminClientConfigured()) {
    return {
      success: false,
      error: "הסרת משתמשי ניהול אינה מוגדרת בשרת.",
    };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) <= 1) {
    return { success: false, error: "חייב להישאר לפחות מנהל אחד במערכת." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_primary_admin")
    .eq("id", input.profileId)
    .maybeSingle();

  if (!target || target.role !== "admin") {
    return { success: false, error: "משתמש הניהול לא נמצא." };
  }

  if (target.is_primary_admin) {
    return {
      success: false,
      error: "לא ניתן להסיר את מנהל/ת המערכת הראשי/ת.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(input.profileId);

  if (error) {
    return { success: false, error: "הסרת משתמש הניהול נכשלה. נסו שוב." };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
