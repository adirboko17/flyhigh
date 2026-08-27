import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { RankBars, type RankItem } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
  isCollectibleOpenCharge,
} from "@/lib/constants";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";
import {
  membershipExpiryLabel,
  membershipExpiryStatus,
  MEMBERSHIP_EXPIRY_WARNING_DAYS,
} from "@/lib/memberships";
import {
  addDays,
  dayLabelLong,
  israelDateOf,
  monthLabel,
  monthOf,
  monthRange,
  shiftMonth,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "דשבורד ניהול" };

/** כמה חוגים להציג בדירוג התפוסה. */
const OCCUPANCY_LIMIT = 6;

export default async function AdminDashboard() {
  const today = todayInIsrael();
  const currentMonth = monthOf(today);
  const previousMonth = shiftMonth(currentMonth, -1);
  const { start: previousMonthStart } = monthRange(previousMonth);
  const currentMonthRange = monthRange(currentMonth);
  const previousMonthRange = monthRange(previousMonth);
  const weekEnd = addDays(today, 6);

  const supabase = await createAdminDataClient();

  const [
    { data: paidPayments },
    { data: openPaymentRows },
    { count: enrollmentsThisMonth },
    { count: enrollmentsLastMonth },
    { count: pendingEnrollments },
    { data: activeClassEnrollments },
    { data: sessions },
    { data: classes },
    { data: instructors },
    { count: waitlistCount },
    { count: awaitingPrivateLessons },
    { count: awaitingActivities },
    { data: recentEnrollments },
    { data: memberships },
  ] = await Promise.all([
    // חלון של חודשיים לחישוב המגמה, ובנוסף כל חוב פתוח/חלקי בלי תלות בתאריך.
    supabase
      .from("payments")
      .select("amount, status, paid_at")
      .eq("status", "paid")
      .gte("paid_at", previousMonthStart),
    supabase
      .from("payments")
      .select(
        "amount, status, payment_method, external_reference, payment_receipts(amount)"
      )
      .in("status", ["pending", "partial"]),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${currentMonthRange.start}T00:00:00`)
      .lte("created_at", `${currentMonthRange.end}T23:59:59`),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${previousMonthRange.start}T00:00:00`)
      .lte("created_at", `${previousMonthRange.end}T23:59:59`),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("enrollments")
      .select(
        "class_id, status, payment_status, payments(status, payment_method, external_reference)"
      )
      .eq("type", "class")
      .eq("status", "active")
      .not("class_id", "is", null),
    supabase
      .from("class_sessions")
      .select(
        "id, session_date, start_time, end_time, status, substitute:instructors!class_sessions_substitute_instructor_id_fkey(full_name), classes(title, instructors(full_name))"
      )
      .gte("session_date", today)
      .lte("session_date", weekEnd)
      .order("session_date")
      .order("start_time"),
    supabase.from("classes").select("id, title, capacity, status"),
    supabase
      .from("instructors")
      .select("id, hourly_rate, monthly_salary, pay_type, status"),
    supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting"),
    supabase
      .from("private_lesson_slots")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_schedule"),
    supabase
      .from("activity_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_schedule"),
    supabase
      .from("enrollments")
      .select(
        "id, type, status, payment_status, created_at, classes(title), programs(title), pool_passes(title), private_lessons(title), children(full_name), profiles(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("enrollments")
      .select(
        "id, ends_on, parent_id, programs(title), children(full_name), profiles(full_name, phone)"
      )
      .eq("type", "program")
      .eq("status", "active")
      .not("ends_on", "is", null)
      .lte("ends_on", addDays(today, MEMBERSHIP_EXPIRY_WARNING_DAYS))
      .order("ends_on"),
  ]);

  const allPayments = paidPayments ?? [];
  const allSessions = sessions ?? [];
  const enrollmentsThisMonthCount = enrollmentsThisMonth ?? 0;
  const enrollmentsLastMonthCount = enrollmentsLastMonth ?? 0;
  const pendingEnrollmentsCount = pendingEnrollments ?? 0;

  const revenueOfMonth = (month: string) =>
    allPayments
      .filter(
        (payment) =>
          payment.status === "paid" &&
          payment.paid_at &&
          israelDateOf(payment.paid_at).startsWith(month)
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const revenueThisMonth = revenueOfMonth(currentMonth);
  const revenueLastMonth = revenueOfMonth(previousMonth);

  const openCharges = (openPaymentRows ?? []).filter((payment) =>
    isCollectibleOpenCharge(
      payment.status,
      payment.payment_method,
      payment.external_reference
    )
  );
  const openAmount = openCharges.reduce((sum, payment) => {
    const paid = (payment.payment_receipts ?? []).reduce(
      (acc, receipt) => acc + Number(receipt.amount),
      0
    );
    return sum + Math.max(0, Number(payment.amount) - paid);
  }, 0);

  const scheduledSessions = allSessions.filter(
    (session) => session.status !== "cancelled"
  );
  const todaySessions = allSessions.filter(
    (session) => session.session_date === today
  );
  // כשאין מפגשים היום מציגים את הקרובים, כדי שהכרטיס לא יישאר ריק.
  const agendaIsToday = todaySessions.length > 0;
  const agenda = agendaIsToday ? todaySessions : scheduledSessions.slice(0, 5);

  const registeredByClass = new Map<string, number>();
  for (const enrollment of activeClassEnrollments ?? []) {
    if (!enrollment.class_id || !enrollmentHoldsSeat(enrollment)) continue;
    registeredByClass.set(
      enrollment.class_id,
      (registeredByClass.get(enrollment.class_id) ?? 0) + 1
    );
  }

  const occupancy = (classes ?? [])
    .filter((cls) => cls.status !== "inactive")
    .map((cls) => {
      const registered = registeredByClass.get(cls.id) ?? 0;
      return {
        id: cls.id,
        title: cls.title,
        registered,
        capacity: cls.capacity,
        percent:
          cls.capacity != null && cls.capacity > 0
            ? Math.round((registered / cls.capacity) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.percent - a.percent || b.registered - a.registered);

  const fullClasses = occupancy.filter((cls) => cls.percent >= 100).length;
  const emptyClasses = occupancy.filter((cls) => cls.registered === 0).length;

  const instructorsWithoutRate = (instructors ?? []).filter(
    (instructor) =>
      instructor.status === "active" &&
      (instructor.pay_type === "monthly"
        ? instructor.monthly_salary === null ||
          Number(instructor.monthly_salary) <= 0
        : instructor.hourly_rate === null || Number(instructor.hourly_rate) <= 0)
  ).length;

  const expiringMemberships = (memberships ?? []).filter(
    (row): row is typeof row & { ends_on: string } => Boolean(row.ends_on)
  );
  const expiredCount = expiringMemberships.filter(
    (row) => membershipExpiryStatus(row.ends_on, today) === "expired"
  ).length;
  const endingSoonCount = expiringMemberships.length - expiredCount;

  const tasks: TaskItem[] = [
    openCharges.length > 0 && {
      icon: "🧾",
      tone: "amber" as const,
      title: `${openCharges.length} ${openCharges.length === 1 ? "חיוב ממתין" : "חיובים ממתינים"} לגבייה`,
      detail: `סך ${formatCurrency(openAmount)} שטרם נגבו`,
      href: "/admin/collections",
    },
    (waitlistCount ?? 0) > 0 && {
      icon: "⏳",
      tone: "violet" as const,
      title: `${waitlistCount} ברשימת המתנה`,
      detail: "אפשר לשבץ אותם לחוגים עם מקום פנוי",
      href: "/admin/classes",
    },
    (awaitingPrivateLessons ?? 0) > 0 && {
      icon: "🎯",
      tone: "brand" as const,
      title: `${awaitingPrivateLessons} ${awaitingPrivateLessons === 1 ? "שיעור פרטי" : "שיעורים פרטיים"} לתיאום`,
      detail: "לקוחות שרכשו וממתינים לתיאום מועד",
      href: "/admin/private-lessons",
    },
    (awaitingActivities ?? 0) > 0 && {
      icon: "👨‍👩‍👧",
      tone: "amber" as const,
      title: `${awaitingActivities} ${awaitingActivities === 1 ? "פעילות" : "פעילויות"} לתיאום`,
      detail: "לקוחות שרכשו פעילות וממתינים לתיאום מועד",
      href: "/admin/private-lessons",
    },
    pendingEnrollmentsCount > 0 && {
      icon: "📝",
      tone: "brand" as const,
      title: `${pendingEnrollmentsCount} ${pendingEnrollmentsCount === 1 ? "הרשמה ממתינה" : "הרשמות ממתינות"} לאישור`,
      detail: "הרשמות שנפתחו ולא הושלמו",
      href: "/admin/activity",
    },
    fullClasses > 0 && {
      icon: "🚦",
      tone: "rose" as const,
      title: `${fullClasses} ${fullClasses === 1 ? "חוג מלא" : "חוגים מלאים"}`,
      detail: "שקלו לפתוח קבוצה נוספת",
      href: "/admin/classes",
    },
    emptyClasses > 0 && {
      icon: "🪑",
      tone: "slate" as const,
      title: `${emptyClasses} ${emptyClasses === 1 ? "חוג ללא נרשמים" : "חוגים ללא נרשמים"}`,
      detail: "כדאי לקדם אותם או לעדכן את הסטטוס",
      href: "/admin/classes",
    },
    instructorsWithoutRate > 0 && {
      icon: "💰",
      tone: "rose" as const,
      title: `${instructorsWithoutRate} ${instructorsWithoutRate === 1 ? "מדריכה ללא שכר" : "מדריכות ללא שכר"}`,
      detail: "השכר שלהן לא נכלל בדוח הכספים",
      href: "/admin/instructors",
    },
    expiringMemberships.length > 0 && {
      icon: "🎫",
      tone: expiredCount > 0 ? ("rose" as const) : ("amber" as const),
      title:
        expiredCount > 0 && endingSoonCount > 0
          ? `${endingSoonCount} מנויים לפני סיום · ${expiredCount} שפג תוקפם`
          : expiredCount > 0
            ? `${expiredCount} ${expiredCount === 1 ? "מנוי שפג תוקפו" : "מנויים שפג תוקפם"}`
            : `${endingSoonCount} ${endingSoonCount === 1 ? "מנוי מסתיים" : "מנויים מסתיימים"} בקרוב`,
      detail: `התראה עד ${MEMBERSHIP_EXPIRY_WARNING_DAYS} ימים לפני תום המנוי`,
      href: "#expiring-memberships",
    },
  ].filter(Boolean) as TaskItem[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="דשבורד ניהול"
        description={`${dayLabelLong(today)} · סיכום ${monthLabel(currentMonth)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="הכנסות החודש"
          value={formatCurrency(revenueThisMonth)}
          icon="💳"
          tone="brand"
          hint={compareHint(revenueThisMonth, revenueLastMonth)}
        />
        <StatCard
          label="ממתין לגבייה"
          value={formatCurrency(openAmount)}
          icon="🧾"
          tone={openCharges.length > 0 ? "amber" : "aqua"}
          hint={
            openCharges.length > 0
              ? `${openCharges.length} חיובים פתוחים`
              : "אין חובות פתוחים"
          }
        />
        <StatCard
          label="הרשמות החודש"
          value={enrollmentsThisMonthCount}
          icon="📝"
          tone="violet"
          hint={compareHint(enrollmentsThisMonthCount, enrollmentsLastMonthCount)}
        />
        <StatCard
          label="מפגשים השבוע"
          value={scheduledSessions.length}
          icon="🏊"
          tone="aqua"
          hint={
            todaySessions.length > 0
              ? `${todaySessions.length} מהם היום`
              : "אין מפגשים היום"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {agendaIsToday ? "המפגשים של היום" : "המפגשים הקרובים"}
            </CardTitle>
            <Link
              href="/admin/calendar"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              ללוח השנה
            </Link>
          </CardHeader>
          <CardContent>
            {agenda.length === 0 ? (
              <EmptyState
                icon="🌤️"
                title="אין מפגשים השבוע"
                description="הלוח פנוי. אפשר לשבץ מפגשים חדשים מלוח השנה."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {agenda.map((session) => {
                  const substitute = session.substitute?.full_name ?? null;
                  const instructor = session.classes?.instructors?.full_name ?? null;

                  return (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="w-16 shrink-0 rounded-xl bg-brand-50 px-2 py-1.5 text-center">
                          <span className="block font-display text-sm font-bold text-brand-700">
                            {session.start_time.slice(0, 5)}
                          </span>
                          <span className="block text-[10px] text-brand-500">
                            {session.end_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">
                            {session.classes?.title ?? "חוג שנמחק"}
                          </p>
                          <p className="truncate text-sm text-ink-500">
                            {!agendaIsToday &&
                              `${shortDayLabel(session.session_date)} · `}
                            {substitute ?? instructor ?? "ללא מדריכה"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {substitute && <Badge tone="warning">מחליפה</Badge>}
                        {session.status === "cancelled" && (
                          <Badge tone="danger">בוטל</Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>דורש טיפול</CardTitle>
            {tasks.length > 0 && <Badge tone="warning">{tasks.length}</Badge>}
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aqua-100 text-2xl">
                  ✓
                </div>
                <p className="font-display text-base font-bold text-ink-800">
                  הכול מסודר
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  אין חובות פתוחים או משימות שדורשות תשומת לב.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.title}>
                    <Link
                      href={task.href}
                      className="flex items-start gap-3 rounded-xl border border-ink-100 px-3.5 py-3 transition-colors hover:border-ink-200 hover:bg-ink-50"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base",
                          TASK_TONES[task.tone]
                        )}
                      >
                        {task.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-900">
                          {task.title}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {task.detail}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {expiringMemberships.length > 0 && (
        <Card id="expiring-memberships">
          <CardHeader>
            <CardTitle>מנויים שעומדים להסתיים</CardTitle>
            <Badge tone={expiredCount > 0 ? "danger" : "warning"}>
              {expiringMemberships.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-ink-100">
              {expiringMemberships.map((row) => {
                const status = membershipExpiryStatus(row.ends_on, today);
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-900">
                        {row.profiles?.full_name ?? "לקוח"}
                        {row.children?.full_name
                          ? ` · ${row.children.full_name}`
                          : ""}
                      </p>
                      <p className="truncate text-sm text-ink-500">
                        {row.programs?.title ?? "מנוי"}
                        {row.profiles?.phone ? ` · ${row.profiles.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={status === "expired" ? "danger" : "warning"}>
                        {membershipExpiryLabel(row.ends_on, today)}
                      </Badge>
                      <span className="text-xs text-ink-400">
                        עד {formatDate(row.ends_on)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>תפוסת החוגים</CardTitle>
            <Link
              href="/admin/classes"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              לכל החוגים
            </Link>
          </CardHeader>
          <CardContent>
            <RankBars
              items={occupancy.slice(0, OCCUPANCY_LIMIT).map(toOccupancyItem)}
              formatValue={(value) => `${value}%`}
              emptyLabel="אין חוגים פעילים להצגה"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הרשמות אחרונות</CardTitle>
            <Link
              href="/admin/activity"
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              לכל הפעילות
            </Link>
          </CardHeader>
          <CardContent>
            {recentEnrollments && recentEnrollments.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {recentEnrollments.map((enrollment) => {
                  const title =
                    enrollment.classes?.title ??
                    enrollment.programs?.title ??
                    enrollment.pool_passes?.title ??
                    enrollment.private_lessons?.title ??
                    ENROLLMENT_TYPE[enrollment.type];

                  return (
                    <li
                      key={enrollment.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900">{title}</p>
                        <p className="truncate text-sm text-ink-500">
                          {enrollment.profiles?.full_name ?? "-"}
                          {enrollment.children?.full_name
                            ? ` · ${enrollment.children.full_name}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Badge
                          tone={
                            ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status].tone
                          }
                        >
                          {ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status].label}
                        </Badge>
                        <Badge tone={ENROLLMENT_STATUS[enrollment.status].tone}>
                          {ENROLLMENT_STATUS[enrollment.status].label}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon="📝"
                title="אין הרשמות עדיין"
                description="ההרשמות האחרונות יופיעו כאן ברגע שיתקבלו."
                className="border-0 bg-transparent py-8"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type TaskTone = "brand" | "aqua" | "amber" | "rose" | "violet" | "slate";

type TaskItem = {
  icon: string;
  tone: TaskTone;
  title: string;
  detail: string;
  href: string;
};

const TASK_TONES: Record<TaskTone, string> = {
  brand: "bg-brand-100 text-brand-700",
  aqua: "bg-aqua-100 text-aqua-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-ink-100 text-ink-600",
};

function toOccupancyItem(cls: {
  id: string;
  title: string;
  registered: number;
  capacity: number | null;
  percent: number;
}): RankItem {
  return {
    key: cls.id,
    label: cls.title,
    sublabel:
      cls.capacity == null
        ? `${cls.registered} · ללא הגבלה`
        : `${cls.registered}/${cls.capacity}`,
    value: cls.percent,
    barClassName:
      cls.percent >= 100
        ? "bg-rose-500"
        : cls.percent >= 75
          ? "bg-amber-500"
          : cls.percent > 0
            ? "bg-brand-500"
            : "bg-ink-200",
  };
}

/** "יום ה׳, 30.7" — לשורות של מפגשים שאינם היום. */
function shortDayLabel(date: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** משווה את החודש הנוכחי לקודם בטקסט קצר לכרטיס ה־KPI. */
function compareHint(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "אין נתוני השוואה לחודש שעבר" : "ללא פעילות החודש";
  }

  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "ללא שינוי מהחודש שעבר";
  return `${change > 0 ? "▲" : "▼"} ${Math.abs(change)}% מהחודש שעבר`;
}
