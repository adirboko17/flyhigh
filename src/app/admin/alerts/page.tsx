import { AlertsBoard } from "@/components/admin/AlertsBoard";
import { loadAdminAlerts } from "@/lib/admin/alerts";
import { parseAlertTab } from "@/lib/admin/alertTypes";

export const metadata = { title: "התראות" };

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const alerts = await loadAdminAlerts();

  return <AlertsBoard alerts={alerts} initialTab={parseAlertTab(tab)} />;
}
