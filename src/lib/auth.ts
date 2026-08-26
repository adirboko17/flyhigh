import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasIncompleteAuthSession } from "@/lib/supabase/authSession";
import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;

/** עמודות שנדרשות לניווט והרשאות — בלי select("*") בכל מעבר עמוד. */
const PROFILE_COLUMNS =
  "id, full_name, role, email, phone, is_primary_admin, created_at, address, birth_date, city, gender, receipt_id_number, receipt_name" as const;

async function fetchProfileById(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Profile | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  return profile ?? null;
}

/**
 * פרופיל לפי מזהה — נשמר בזיכרון שרת ל־60 שניות כדי שלא נפגע ב־DB
 * בכל מעבר בין עמודי ניהול. משתמש ב־service role כי unstable_cache
 * לא יכול לגשת ל־cookies של המשתמש.
 */
function getCachedProfileById(userId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .single();
      return profile ?? null;
    },
    ["session-profile", userId],
    { revalidate: 60, tags: [`profile:${userId}`] }
  )();
}

/**
 * מחזיר את המשתמש המחובר ואת הפרופיל שלו, או null אם לא מחובר.
 * cache מונע קריאה כפולה באותה בקשה כאשר גם ה-layout וגם העמוד צריכים פרופיל.
 */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const cookieStore = await cookies();
  if (hasIncompleteAuthSession(cookieStore.getAll())) {
    return null;
  }

  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  if (!userId) return null;

  if (isAdminClientConfigured()) {
    return getCachedProfileById(userId);
  }

  return fetchProfileById(userId, supabase);
});

/**
 * מזהה המשתמש המחובר לפי ה־JWT. getClaims מאמת את החתימה מקומית מול ה־JWKS
 * של הפרויקט, ולכן חוסך את קריאת הרשת ש־getUser מבצע בכל טעינת עמוד.
 */
async function currentUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
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
  const userId = await currentUserId(supabase);
  if (!userId) return null;

  const { data } = await supabase
    .from("instructors")
    .select("*")
    .eq("profile_id", userId)
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
