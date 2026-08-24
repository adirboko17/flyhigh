import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * מרענן את ה־session בעת הצורך וחוסם גישה לאזורים מוגנים ללא התחברות.
 *
 * getClaims מאמת את ה־JWT מקומית מול ה־JWKS (עם cache), ומרענן את הטוקן
 * רק כשהוא עומד לפוג — בלי קריאת רשת ל־Auth בכל מעבר עמוד. אם האימות
 * המקומי נכשל, נופלים ל־getUser כדי לנקות session פגום.
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

  const { data, error } = await supabase.auth.getClaims();
  let signedIn = Boolean(data?.claims?.sub);

  // אימות מקומי נכשל (JWKS/טוקן פג) — בדיקה מול Auth ורק אז מנקים session פגום.
  if (!signedIn && error) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    signedIn = Boolean(userData.user);
    if (userError) {
      clearSupabaseAuthCookies(request, supabaseResponse);
    }
  }

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/instructor") ||
    path.startsWith("/parent");

  if (!signedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
) {
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("sb-") &&
      (cookie.name.includes("auth-token") || cookie.name.includes("auth."))
    ) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      request.cookies.set(cookie.name, "");
    }
  }
}
