import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_TYPE,
} from "@/lib/constants";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "האזור האישי" };

export default async function ParentDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: children }, { data: enrollments }, { data: payments }] =
    await Promise.all([
      supabase.from("children").select("*").order("created_at"),
      supabase
        .from("enrollments")
        .select("*, classes(title), programs(title), children(full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("*"),
    ]);

  const activeEnrollments =
    enrollments?.filter((e) => e.status === "active").length ?? 0;
  const openPayments =
    payments?.filter((p) => p.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">
            שלום, {profile.full_name} 👋
          </h1>
          <p className="text-sm text-ink-500">הנה סקירה של הפעילות שלכם</p>
        </div>
        <ButtonLink href="/classes">הרשמה לחוג חדש</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="הילדים שלי" value={children?.length ?? 0} icon="🧒" tone="brand" />
        <StatCard label="הרשמות פעילות" value={activeEnrollments} icon="📝" tone="aqua" />
        <StatCard label="תשלומים פתוחים" value={openPayments} icon="💳" tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ההרשמות שלי</CardTitle>
          <Link href="/parent/enrollments" className="text-sm font-semibold text-brand-600 hover:underline">
            הכל
          </Link>
        </CardHeader>
        <CardContent>
          {enrollments && enrollments.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {enrollments.slice(0, 5).map((e) => {
                const title =
                  e.classes?.title ?? e.programs?.title ?? ENROLLMENT_TYPE[e.type];
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold text-ink-900">{title}</p>
                      <p className="text-sm text-ink-500">
                        {e.children?.full_name ?? "-"} · {ENROLLMENT_TYPE[e.type]}
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
            <EmptyState
              title="עדיין אין הרשמות"
              description="עיינו בחוגים שלנו והירשמו בקלות."
              icon="📝"
              action={<ButtonLink href="/classes">לעיון בחוגים</ButtonLink>}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הילדים שלי</CardTitle>
            <Link href="/parent/children" className="text-sm font-semibold text-brand-600 hover:underline">
              ניהול
            </Link>
          </CardHeader>
          <CardContent>
            {children && children.length > 0 ? (
              <ul className="space-y-2">
                {children.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-2.5">
                    <span className="text-lg">🧒</span>
                    <span className="font-medium text-ink-800">{c.full_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">לא נוספו ילדים עדיין.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תשלומים אחרונים</CardTitle>
            <Link href="/parent/payments" className="text-sm font-semibold text-brand-600 hover:underline">
              הכל
            </Link>
          </CardHeader>
          <CardContent>
            {payments && payments.length > 0 ? (
              <ul className="space-y-2">
                {payments.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5">
                    <span className="font-medium text-ink-800">{formatCurrency(p.amount)}</span>
                    <Badge tone={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "neutral"}>
                      {p.status === "paid" ? "שולם" : p.status === "pending" ? "ממתין" : p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">אין תשלומים להצגה.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
