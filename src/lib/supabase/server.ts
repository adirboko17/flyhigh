import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database.types";

/**
 * לקוח Supabase לצד השרת (Server Components, Route Handlers, Server Actions).
 * משתמש בעוגיות הבקשה לניהול ה־session.
 * cache מונע יצירת לקוח נפרד בכל קריאה באותה בקשה.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // רק ה־middleware מרענן טוקנים. ב־RSC רענון כושל זורק AuthApiError לכל עמוד.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // נקרא מתוך Server Component - ניתן להתעלם כאשר יש middleware שמרענן session.
          }
        },
      },
    }
  );
});
