import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * מרענן את ה־session בכל בקשה ומגן על אזורים מאובטחים לפי תפקיד.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin");
  const isInstructorArea = path.startsWith("/instructor");
  const isParentArea = path.startsWith("/parent");
  const isProtected = isAdminArea || isInstructorArea || isParentArea;

  // לא מחובר ומנסה להיכנס לאזור מוגן → התחברות
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // בדיקת תפקיד עבור אזורים מוגנים
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (isAdminArea && role !== "admin") {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
    if (isInstructorArea && role !== "instructor" && role !== "admin") {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
  }

  return supabaseResponse;
}

function homeForRole(role?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  if (role === "parent") return "/parent/dashboard";
  return "/login";
}
