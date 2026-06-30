import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_TYPE,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "דשבורד ניהול" };

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "profiles" | "children" | "classes" | "enrollments" | "payments" | "waitlist",
  filter?: (q: any) => any
) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    customers,
    children,
    activeClasses,
    activeEnrollments,
    openPayments,
    waitlistCount,
  ] = await Promise.all([
    count(supabase, "profiles", (q) => q.eq("role", "parent")),
    count(supabase, "children"),
    count(supabase, "classes", (q) => q.eq("status", "active")),
    count(supabase, "enrollments", (q) => q.eq("status", "active")),
    count(supabase, "payments", (q) => q.eq("status", "pending")),
    count(supabase, "waitlist", (q) => q.eq("status", "waiting")),
  ]);

  const { data: recentEnrollments } = await supabase
    .from("enrollments")
    .select("*, classes(title), programs(title), children(full_name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: paidPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "paid");
  const totalRevenue = (paidPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          דשבורד ניהול
        </h1>
        <p className="mt-1 text-sm text-ink-500">סקירה כללית של הפעילות בעסק</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="לקוחות" value={customers} icon="👨‍👩‍👧" tone="brand" />
        <StatCard label="ילדים" value={children} icon="🧒" tone="aqua" />
        <StatCard label="חוגים פעילים" value={activeClasses} icon="🏊" tone="violet" />
        <StatCard label="הרשמות פעילות" value={activeEnrollments} icon="📝" tone="amber" />
        <StatCard label="תשלומים פתוחים" value={openPayments} icon="💳" tone="rose" />
        <StatCard label="רשימת המתנה" value={waitlistCount} icon="⏳" tone="slate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>הרשמות אחרונות</CardTitle>
            <Link href="/admin/enrollments" className="text-sm font-semibold text-brand-600 hover:underline">
              הכל
            </Link>
          </CardHeader>
          <CardContent>
            {recentEnrollments && recentEnrollments.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {recentEnrollments.map((e) => {
                  const title = e.classes?.title ?? e.programs?.title ?? ENROLLMENT_TYPE[e.type];
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-semibold text-ink-900">{title}</p>
                        <p className="text-sm text-ink-500">
                          {e.profiles?.full_name ?? "-"}
                          {e.children?.full_name ? ` · ${e.children.full_name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={ENROLLMENT_PAYMENT_STATUS[e.payment_status].tone}>
                          {ENROLLMENT_PAYMENT_STATUS[e.payment_status].label}
                        </Badge>
                        <Badge tone={ENROLLMENT_STATUS[e.status].tone}>
                          {ENROLLMENT_STATUS[e.status].label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">אין הרשמות עדיין.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>סיכום הכנסות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-brand-gradient p-5 text-white">
              <p className="text-sm text-brand-50/80">סך הכנסות (שולמו)</p>
              <p className="mt-1 font-display text-3xl font-extrabold">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
              <span className="text-sm font-medium text-amber-700">תשלומים ממתינים</span>
              <span className="font-bold text-amber-700">{openPayments}</span>
            </div>
            <Link
              href="/admin/reports"
              className="block rounded-xl border border-ink-200 px-4 py-3 text-center text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              לצפייה בדוחות המלאים
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
