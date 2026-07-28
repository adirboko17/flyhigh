import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * מרענן את ה־session בכל בקשה וחוסם גישה לאזורים מוגנים ללא התחברות.
 *
 * בדיקת התפקיד עצמה נעשית ב־layout של כל אזור (requireRole) ובמדיניות ה־RLS,
 * כדי שה־middleware לא יבצע שאילתה למסד הנתונים בכל ניווט.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims מאמת את חתימת הטוקן מקומית מול ה־JWKS של הפרויקט,
  // ולכן אינו עולה בקריאת רשת כמו getUser.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/instructor") ||
    path.startsWith("/parent");

  if (!signedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
