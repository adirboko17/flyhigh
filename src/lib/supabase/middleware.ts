import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * מרענן את ה־session בכל בקשה וחוסם גישה לאזורים מוגנים ללא התחברות.
 *
 * חשוב לקרוא ל־getUser (לא רק getClaims): כך ה־access token מתרענן פעם אחת
 * ב־middleware, והעמוד לא מנסה לרענן במקביל בכל שאילתת DB — מרוץ שגורם
 * ל־"Invalid Refresh Token" ומאט כל ניווט בעשרות שניות.
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

  const { data, error } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  // טוקן רענון פגום/משומש — מנקים כדי לא לנסות לרענן שוב בכל בקשה.
  if (error) {
    clearSupabaseAuthCookies(request, supabaseResponse);
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
