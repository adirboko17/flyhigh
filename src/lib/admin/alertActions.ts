"use server";

import { loadAdminAlerts, unreadAlertCount } from "@/lib/admin/alerts";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";

export async function getUnreadAlertCount() {
  return unreadAlertCount();
}

/** מסמן את ההתראות הפתוחות כרגע כנקראו. נקרא רק בכניסה לעמוד. */
export async function markCurrentAlertsSeen(): Promise<boolean> {
  const profile = await requireRole("admin");
  const alerts = await loadAdminAlerts();
  if (alerts.length === 0) return true;

  const supabase = await createAdminDataClient();
  const { error } = await supabase.from("admin_alert_reads").upsert(
    alerts.map((alert) => ({
      admin_id: profile.id,
      alert_key: alert.key,
    })),
    { onConflict: "admin_id,alert_key", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[admin-alerts] mark seen", error);
    return false;
  }
  return true;
}
