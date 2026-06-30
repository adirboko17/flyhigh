import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

/**
 * מחזיר את המשתמש המחובר ואת הפרופיל שלו, או null אם לא מחובר.
 */
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

/**
 * מחייב התחברות. מפנה ל־/login אם אין משתמש.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * מחייב תפקיד מסוים (או אחד מרשימה). מפנה לעמוד הבית המתאים אחרת.
 */
export async function requireRole(
  roles: Profile["role"] | Profile["role"][]
): Promise<Profile> {
  const profile = await requireProfile();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(profile.role)) {
    redirect(homeForRole(profile.role));
  }
  return profile;
}

/**
 * מחזיר את רשומת המדריכה המשויכת למשתמש המחובר (או null).
 */
export async function getCurrentInstructor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("instructors")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  return data ?? null;
}

export function homeForRole(role: Profile["role"]): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "instructor":
      return "/instructor";
    case "parent":
      return "/parent/dashboard";
    default:
      return "/";
  }
}
