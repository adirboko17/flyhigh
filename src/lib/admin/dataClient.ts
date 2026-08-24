import { cache } from "react";
import { requireRole } from "@/lib/auth";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * לקוח נתונים לעמודי ניהול: קודם מוודאים שהמשתמש מנהל, ואז עוקפים RLS.
 * בלי זה כל SELECT מעריך כמה מדיניות permissive במקביל — וזה מורגש בכל מעבר.
 */
export const createAdminDataClient = cache(async () => {
  await requireRole("admin");
  return isAdminClientConfigured() ? createAdminClient() : createClient();
});
