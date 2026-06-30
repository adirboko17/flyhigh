import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "שכר ופעילות" };

export default async function InstructorPayrollPage() {
  await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const { data: classes } = instructor
    ? await supabase.from("classes").select("id, title").eq("instructor_id", instructor.id)
    : { data: [] };

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: sessions } =
    classIds.length > 0
      ? await supabase
          .from("attendance")
          .select("date, class_id")
          .in("class_id", classIds)
      : { data: [] };

  // מספר מפגשים ייחודיים (תאריך + חוג)
  const uniqueSessions = new Set(
    (sessions ?? []).map((s) => `${s.class_id}|${s.date}`)
  ).size;

  const rate = instructor?.hourly_rate ? Number(instructor.hourly_rate) : 0;
  const estimated = uniqueSessions * rate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="שכר ופעילות"
        description="סיכום הפעילות וההערכת שכר שלך"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="תעריף שעתי" value={formatCurrency(rate)} icon="💰" tone="brand" />
        <StatCard label="מפגשים שהועברו" value={uniqueSessions} icon="📅" tone="aqua" />
        <StatCard label="הערכת שכר" value={formatCurrency(estimated)} icon="🧮" tone="violet" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>החוגים שלי</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(classes ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5">
                <span className="font-medium text-ink-800">{c.title}</span>
                <Badge tone="brand">
                  {(sessions ?? []).filter((s) => s.class_id === c.id).length} רישומים
                </Badge>
              </li>
            ))}
            {(!classes || classes.length === 0) && (
              <p className="text-sm text-ink-400">אין חוגים משויכים.</p>
            )}
          </ul>
        </CardContent>
      </Card>

      <p className="rounded-xl border border-dashed border-ink-200 bg-white p-4 text-center text-sm text-ink-400">
        הערכת השכר מבוססת על מספר המפגשים. חישוב מדויק לפי שעות בפועל יתווסף בהמשך.
      </p>
    </div>
  );
}
