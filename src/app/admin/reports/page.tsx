import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "דוחות" };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [
    { data: payments },
    { data: enrollments },
    { data: attendance },
    { data: classes },
    { data: instructors },
  ] = await Promise.all([
    supabase.from("payments").select("amount, status"),
    supabase.from("enrollments").select("status"),
    supabase.from("attendance").select("status"),
    supabase.from("classes").select("capacity, status"),
    supabase.from("instructors").select("full_name, hourly_rate"),
  ]);

  const revenue = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = (payments ?? [])
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);

  const present = (attendance ?? []).filter((a) => a.status === "present").length;
  const attendanceRate = attendance && attendance.length > 0
    ? Math.round((present / attendance.length) * 100)
    : 0;

  const activeClasses = (classes ?? []).filter((c) => c.status === "active");
  const totalCapacity = activeClasses.reduce((s, c) => s + c.capacity, 0);
  const takenSeats = (enrollments ?? []).filter((e) => e.status === "active").length;
  const occupancy = totalCapacity > 0 ? Math.round((takenSeats / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="דוחות" description="תמונת מצב כספית ותפעולית" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="הכנסות (שולמו)" value={formatCurrency(revenue)} icon="💰" tone="aqua" />
        <StatCard label="לגבייה" value={formatCurrency(pending)} icon="⏳" tone="amber" />
        <StatCard label="אחוז נוכחות" value={`${attendanceRate}%`} icon="✅" tone="brand" />
        <StatCard label="תפוסת חוגים" value={`${occupancy}%`} icon="📈" tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הערכת שכר מדריכות</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-ink-500">
              לפי תעריף שעתי (חישוב מלא יתווסף עם נתוני שעות בפועל).
            </p>
            <ul className="space-y-2">
              {(instructors ?? []).map((i, idx) => (
                <li key={idx} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5">
                  <span className="font-medium text-ink-800">{i.full_name}</span>
                  <span className="text-ink-600">{formatCurrency(i.hourly_rate)} / שעה</span>
                </li>
              ))}
              {(!instructors || instructors.length === 0) && (
                <p className="text-sm text-ink-400">אין מדריכות.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סטטוס גבייה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar label="נגבה" value={revenue} total={revenue + pending} tone="bg-aqua-500" />
            <Bar label="ממתין" value={pending} total={revenue + pending} tone="bg-amber-500" />
          </CardContent>
        </Card>
      </div>

      <p className="rounded-xl border border-dashed border-ink-200 bg-white p-4 text-center text-sm text-ink-400">
        בקרוב: דוחות מתקדמים עם פילוח לפי תקופות, ייצוא לאקסל וגרפים.
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink-600">{label}</span>
        <span className="font-semibold text-ink-800">{formatCurrency(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
