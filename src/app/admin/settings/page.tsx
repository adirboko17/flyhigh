import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "הגדרות מערכת" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("system_settings").select("*");

  return (
    <div className="space-y-6">
      <PageHeader title="הגדרות מערכת" description="הגדרות כלליות של העסק והמערכת" />

      <div className="grid gap-6 lg:grid-cols-2">
        {(settings ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{settingLabel(s.key)}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre
                dir="ltr"
                className="overflow-x-auto rounded-xl bg-ink-50 p-4 text-left text-xs text-ink-700"
              >
                {JSON.stringify(s.value, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
        {(!settings || settings.length === 0) && (
          <p className="text-sm text-ink-500">אין הגדרות מוגדרות.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>אינטגרציות עתידיות</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            <Integration name="סליקת אשראי (PayPlus)" status="מוכן לחיבור" />
            <Integration name="חשבונית ירוקה" status="מוכן לחיבור" />
            <Integration name="שליחת מיילים אוטומטית" status="מוכן לחיבור" />
            <Integration name="התראות והודעות" status="מוכן לחיבור" />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function settingLabel(key: string): string {
  const map: Record<string, string> = {
    business: "פרטי העסק",
    cancellation_policy: "מדיניות ביטולים",
    registration: "הגדרות הרשמה",
  };
  return map[key] ?? key;
}

function Integration({ name, status }: { name: string; status: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3">
      <span className="font-medium text-ink-800">{name}</span>
      <span className="rounded-full bg-aqua-100 px-2.5 py-0.5 text-xs font-semibold text-aqua-700">
        {status}
      </span>
    </li>
  );
}
