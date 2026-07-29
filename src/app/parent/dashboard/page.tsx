import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { ChildrenPanel, type ParentChild } from "@/components/parent/ChildrenPanel";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { ViewAllDialog } from "@/components/ui/ViewAllDialog";
import { requireProfile } from "@/lib/auth";
import {
  DAY_ABBR,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "@/lib/constants";
import { addDays, dayLabelLong, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";

export const metadata = { title: "האזור האישי" };

/** כמה פריטים להציג בכרטיס עצמו — השאר נפתח ב"צפה בהכל". */
const AGENDA_LIMIT = 5;
const ENROLLMENTS_LIMIT = 4;
const PAYMENTS_LIMIT = 4;

/** עד כמה ימים קדימה מחפשים מפגשים ללוח "המפגשים הקרובים". */
const AGENDA_HORIZON_DAYS = 60;

export default async function ParentDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = todayInIsrael();
  const weekEnd = addDays(today, 6);
  const horizon = addDays(today, AGENDA_HORIZON_DAYS);

  const [
    { data: children },
    { data: enrollments },
    { data: payments },
    { data: receipts },
    { data: waitlist },
  ] = await Promise.all([
    supabase.from("children").select("*").order("created_at"),
    supabase
      .from("enrollments")
      .select(
        "*, classes(id, title, day_of_week, start_time, end_time), programs(title), pool_passes(title), children(full_name)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("receipts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("waitlist")
      .select("id, classes(title), children(full_name)")
      .eq("status", "waiting"),
  ]);

  const allChildren = children ?? [];
  const allEnrollments = enrollments ?? [];
  const allPayments = payments ?? [];
  const allReceipts = receipts ?? [];
  const waitingList = waitlist ?? [];

  const activeEnrollments = allEnrollments.filter((e) => e.status === "active");
  const pendingEnrollments = allEnrollments.filter((e) => e.status === "pending");
  const unpaidEnrollments = allEnrollments.filter(
    (e) =>
      e.status !== "cancelled" &&
      (e.payment_status === "unpaid" || e.payment_status === "partial")
  );

  const openPayments = allPayments.filter((p) => p.status === "pending");
  const openAmount = sumAmount(openPayments);
  const paidAmount = sumAmount(allPayments.filter((p) => p.status === "paid"));

  // הפעילויות הפעילות של כל ילד/ה, ובנפרד אלה שנרשמו על שם ההורה עצמו.
  const activitiesByChild = new Map<string, string[]>();
  const personalActivities: string[] = [];
  for (const enrollment of activeEnrollments) {
    const title = enrollmentTitle(enrollment);
    if (!enrollment.child_id) {
      personalActivities.push(title);
      continue;
    }
    const current = activitiesByChild.get(enrollment.child_id) ?? [];
    current.push(title);
    activitiesByChild.set(enrollment.child_id, current);
  }

  const kids: ParentChild[] = allChildren.map((child) => ({
    id: child.id,
    full_name: child.full_name,
    birth_date: child.birth_date,
    gender: child.gender,
    notes: child.notes,
    activities: activitiesByChild.get(child.id) ?? [],
  }));
  const enrolledChildren = kids.filter((kid) => kid.activities.length > 0).length;

  // מפגשים נשלפים רק לחוגים שההרשמה אליהם עדיין חיה (לא בוטלה ולא הסתיימה).
  const liveEnrollments = allEnrollments.filter(
    (e) => e.status === "active" || e.status === "pending"
  );
  const liveClassIds = [
    ...new Set(
      liveEnrollments
        .map((e) => e.class_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const sessionsResponse =
    liveClassIds.length > 0
      ? await supabase
          .from("class_sessions")
          .select(
            `id, class_id, session_date, start_time, end_time, status,
            substitute:instructors!class_sessions_substitute_instructor_id_fkey(full_name),
            classes(title, instructors(full_name))`
          )
          .in("class_id", liveClassIds)
          .gte("session_date", today)
          .lte("session_date", horizon)
          .order("session_date")
          .order("start_time")
          .limit(60)
      : null;

  // מי מבני הבית משתתף בכל חוג — כדי שההורה יראה למי המפגש שייך.
  const attendeesByClass = new Map<string, string[]>();
  for (const enrollment of liveEnrollments) {
    if (!enrollment.class_id) continue;
    const attendee = enrollment.children?.full_name ?? profile.full_name;
    const current = attendeesByClass.get(enrollment.class_id) ?? [];
    if (!current.includes(attendee)) current.push(attendee);
    attendeesByClass.set(enrollment.class_id, current);
  }

  const agendaSessions: AgendaSession[] = (sessionsResponse?.data ?? []).map(
    (session) => {
      const substitute = session.substitute?.full_name ?? null;
      const instructor = session.classes?.instructors?.full_name ?? null;

      return {
        id: session.id,
        date: session.session_date,
        startTime: session.start_time,
        endTime: session.end_time,
        status: session.status,
        title: session.classes?.title ?? "חוג",
        attendees: attendeesByClass.get(session.class_id) ?? [],
        instructorName: substitute ?? instructor,
        isSubstitute: Boolean(substitute),
      };
    }
  );

  const upcomingSessions = agendaSessions.filter((s) => s.status !== "cancelled");
  const previewSessions = upcomingSessions.slice(0, AGENDA_LIMIT);
  const weekSessions = upcomingSessions.filter((s) => s.date <= weekEnd);
  const nextSession = upcomingSessions[0] ?? null;

  const tasks: TaskItem[] = [
    openAmount > 0 && {
      icon: "💳",
      tone: "amber" as const,
      title: `יתרה לתשלום: ${formatCurrency(openAmount)}`,
      detail:
        openPayments.length === 1
          ? "חיוב אחד ממתין להשלמה"
          : `${openPayments.length} חיובים ממתינים להשלמה`,
      href: "#payments",
    },
    unpaidEnrollments.length > 0 &&
      openAmount === 0 && {
        icon: "🧾",
        tone: "amber" as const,
        title: `${unpaidEnrollments.length} ${unpaidEnrollments.length === 1 ? "הרשמה" : "הרשמות"} ללא תשלום מלא`,
        detail: "המשרד יעדכן את הסטטוס עם קליטת התשלום",
        href: "#enrollments",
      },
    pendingEnrollments.length > 0 && {
      icon: "⏳",
      tone: "brand" as const,
      title: `${pendingEnrollments.length} ${pendingEnrollments.length === 1 ? "הרשמה ממתינה" : "הרשמות ממתינות"} לאישור`,
      detail: "נעדכן אותכם ברגע שההרשמה תאושר",
      href: "#enrollments",
    },
    waitingList.length > 0 && {
      icon: "📋",
      tone: "violet" as const,
      title: `${waitingList.length} ברשימת המתנה`,
      detail:
        waitingList
          .map((item) => item.classes?.title)
          .filter(Boolean)
          .slice(0, 2)
          .join(", ") || "נעדכן כשיתפנה מקום",
      href: "#enrollments",
    },
    allChildren.length === 0 && {
      icon: "🧒",
      tone: "aqua" as const,
      title: "הוסיפו את הילדים שלכם",
      detail: "אחרי ההוספה תוכלו לרשום אותם לחוגים בלחיצה",
      href: "#children",
    },
    allEnrollments.length === 0 && {
      icon: "🏊",
      tone: "aqua" as const,
      title: "עדיין לא נרשמתם לפעילות",
      detail: "כל החוגים והמסלולים פתוחים להרשמה",
      href: "/classes",
    },
    allChildren.length > 0 &&
      enrolledChildren < allChildren.length &&
      allEnrollments.length > 0 && {
        icon: "✨",
        tone: "brand" as const,
        title: `${allChildren.length - enrolledChildren} מהילדים עדיין ללא חוג`,
        detail: "אפשר לצרף אותם לחוג מתאים לגילם",
        href: "/classes",
      },
  ].filter(Boolean) as TaskItem[];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-glow sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-aqua-400/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70">
              {dayLabelLong(today)}
            </p>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              שלום, {profile.full_name} 👋
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {heroLine({
                nextSession,
                today,
                openAmount,
                hasChildren: allChildren.length > 0,
                hasEnrollments: allEnrollments.length > 0,
              })}
            </p>
          </div>

          {/* כפתורים על גבי הגרדיאנט — ah-btn נותן את הצורה, והצבעים נקבעים כאן. */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/classes"
              className="ah-btn ah-btn--md bg-white text-brand-700 hover:bg-white/90"
            >
              הרשמה לחוג חדש
            </Link>
            <Link
              href="#children"
              className="ah-btn ah-btn--md bg-white/15 text-white ring-1 ring-inset ring-white/30 hover:bg-white/25"
            >
              הילדים שלי
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="הילדים שלי"
          value={allChildren.length}
          icon="🧒"
          tone="brand"
          hint={
            allChildren.length === 0
              ? "לא נוספו ילדים לחשבון"
              : `${enrolledChildren} מתוכם רשומים לפעילות`
          }
        />
        <StatCard
          label="הרשמות פעילות"
          value={activeEnrollments.length}
          icon="📝"
          tone="violet"
          hint={
            pendingEnrollments.length > 0
              ? `${pendingEnrollments.length} ממתינות לאישור`
              : personalActivities.length > 0
                ? `${personalActivities.length} מהן על שמכם`
                : "כל ההרשמות מאושרות"
          }
        />
        <StatCard
          label="יתרה לתשלום"
          value={formatCurrency(openAmount)}
          icon="💳"
          tone={openAmount > 0 ? "amber" : "aqua"}
          hint={
            openAmount > 0
              ? `${openPayments.length} ${openPayments.length === 1 ? "חיוב פתוח" : "חיובים פתוחים"}`
              : paidAmount > 0
                ? `שולם עד היום ${formatCurrency(paidAmount)}`
                : "אין חובות פתוחים"
          }
        />
        <StatCard
          label="מפגשים השבוע"
          value={weekSessions.length}
          icon="🏊"
          tone="aqua"
          hint={
            nextSession
              ? `הקרוב: ${whenLabel(nextSession.date, today)} ב-${formatTime(nextSession.startTime)}`
              : "אין מפגשים מתוכננים"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card id="schedule" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>המפגשים הקרובים</CardTitle>
            <ViewAllDialog
              title="לוח המפגשים"
              description={`כל המפגשים ב-${AGENDA_HORIZON_DAYS} הימים הקרובים`}
              count={upcomingSessions.length}
              disabled={upcomingSessions.length <= AGENDA_LIMIT}
            >
              <ul className="space-y-3">
                {upcomingSessions.map((session) => (
                  <SessionRow key={session.id} session={session} today={today} />
                ))}
              </ul>
            </ViewAllDialog>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <EmptyState
                icon="📅"
                title="אין מפגשים מתוכננים"
                description={
                  allEnrollments.length > 0
                    ? "לוח המפגשים של החוגים שלכם יופיע כאן ברגע שייקבע."
                    : "לאחר ההרשמה לחוג יופיעו כאן כל המפגשים הקרובים."
                }
                action={
                  allEnrollments.length === 0 ? (
                    <ButtonLink href="/classes" size="sm">
                      לעיון בחוגים
                    </ButtonLink>
                  ) : undefined
                }
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="space-y-3">
                {previewSessions.map((session) => (
                  <SessionRow key={session.id} session={session} today={today} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>מה כדאי לעשות</CardTitle>
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
                  אין תשלומים פתוחים או פעולות שממתינות לכם.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ChildrenPanel
          parentId={profile.id}
          kids={kids}
          personalActivities={personalActivities}
          parentName={profile.full_name}
        />

        <Card id="enrollments" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>ההרשמות שלי</CardTitle>
            <ViewAllDialog
              title="ההרשמות שלי"
              description="כל ההרשמות של החשבון, כולל היסטוריה"
              count={allEnrollments.length}
              disabled={allEnrollments.length === 0}
            >
              <ul className="divide-y divide-ink-100">
                {allEnrollments.map((enrollment) => (
                  <EnrollmentRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    parentName={profile.full_name}
                    showDate
                  />
                ))}
              </ul>
            </ViewAllDialog>
          </CardHeader>
          <CardContent>
            {allEnrollments.length === 0 ? (
              <EmptyState
                icon="📝"
                title="עדיין אין הרשמות"
                description="עיינו בחוגים והירשמו בקלות — ההרשמה לוקחת דקה."
                action={
                  <ButtonLink href="/classes" size="sm">
                    לעיון בחוגים
                  </ButtonLink>
                }
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {allEnrollments.slice(0, ENROLLMENTS_LIMIT).map((enrollment) => (
                  <EnrollmentRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    parentName={profile.full_name}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="payments" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>תשלומים וקבלות</CardTitle>
          <ViewAllDialog
            title="תשלומים וקבלות"
            description="כל החיובים, התשלומים והקבלות של החשבון"
            count={allPayments.length + allReceipts.length}
            disabled={allPayments.length === 0 && allReceipts.length === 0}
          >
            <div className="space-y-6">
              <section>
                <h3 className="font-display text-base font-bold text-ink-900">
                  תשלומים
                </h3>
                {allPayments.length > 0 ? (
                  <ul className="mt-2 divide-y divide-ink-100">
                    {allPayments.map((payment) => (
                      <PaymentRow key={payment.id} payment={payment} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-sm text-ink-500">
                    לא נרשמו תשלומים בחשבון.
                  </p>
                )}
              </section>

              <section>
                <h3 className="font-display text-base font-bold text-ink-900">
                  קבלות
                </h3>
                {allReceipts.length > 0 ? (
                  <ul className="mt-2 divide-y divide-ink-100">
                    {allReceipts.map((receipt) => (
                      <li
                        key={receipt.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">
                            קבלה {receipt.receipt_number ?? "—"}
                          </p>
                          <p className="truncate text-sm text-ink-500">
                            {formatDate(receipt.created_at)}
                            {receipt.sent_to_email && " · נשלחה לאימייל"}
                          </p>
                        </div>
                        {receipt.receipt_url ? (
                          <a
                            href={receipt.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                          >
                            צפייה
                          </a>
                        ) : (
                          <span className="shrink-0 text-sm text-ink-400">
                            אין קובץ
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-sm text-ink-500">
                    עדיין לא הופקו קבלות.
                  </p>
                )}
              </section>
            </div>
          </ViewAllDialog>
        </CardHeader>
        <CardContent>
          {allPayments.length === 0 ? (
            <EmptyState
              icon="💳"
              title="אין תשלומים להצגה"
              description="כל חיוב שייפתח, וכל תשלום שיתקבל, יופיעו כאן עם הקבלה."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {allPayments.slice(0, PAYMENTS_LIMIT).map((payment) => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </ul>
          )}
        </CardContent>
        {allPayments.length > 0 && (
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 bg-ink-50/60">
            <span className="text-sm text-ink-600">
              שולם עד היום{" "}
              <span className="font-semibold tabular-nums text-ink-900">
                {formatCurrency(paidAmount)}
              </span>
            </span>
            <span className="text-sm text-ink-600">
              יתרה לתשלום{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  openAmount > 0 ? "text-amber-700" : "text-aqua-700"
                )}
              >
                {formatCurrency(openAmount)}
              </span>
            </span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

type AgendaSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: Enums<"class_session_status">;
  title: string;
  attendees: string[];
  instructorName: string | null;
  isSubstitute: boolean;
};

type EnrollmentRowData = {
  id: string;
  type: Enums<"enrollment_type">;
  status: Enums<"enrollment_status">;
  payment_status: Enums<"enrollment_payment_status">;
  created_at: string;
  classes: {
    title: string;
    day_of_week: number | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
  programs: { title: string } | null;
  pool_passes: { title: string } | null;
  children: { full_name: string } | null;
};

type PaymentRowData = {
  id: string;
  amount: number;
  status: Enums<"payment_status">;
  payment_method: Enums<"payment_method"> | null;
  paid_at: string | null;
  created_at: string;
};

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

function SessionRow({
  session,
  today,
}: {
  session: AgendaSession;
  today: string;
}) {
  const cancelled = session.status === "cancelled";
  const isToday = session.date === today;
  const chip = dateChip(session.date);

  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-3.5 transition-colors",
        cancelled
          ? "border-ink-100 bg-ink-50/60"
          : isToday
            ? "border-brand-200 bg-brand-50/60"
            : "border-ink-100 bg-white hover:border-ink-200"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl",
          isToday && !cancelled
            ? "bg-brand-gradient text-white"
            : "bg-white text-ink-700 ring-1 ring-inset ring-ink-100"
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {chip.month}
        </span>
        <span className="font-display text-xl font-extrabold leading-none">
          {chip.day}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate font-display font-bold text-ink-900",
              cancelled && "text-ink-400 line-through decoration-ink-300"
            )}
          >
            {session.title}
          </p>
          {isToday && !cancelled && <Badge tone="brand">היום</Badge>}
          {cancelled && <Badge tone="danger">בוטל</Badge>}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={15} className="shrink-0 text-ink-400" />
            <span dir="ltr" className="tabular-nums">
              {formatTime(session.startTime)}–{formatTime(session.endTime)}
            </span>
          </span>
          {session.attendees.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="child" size={15} className="shrink-0 text-ink-400" />
              <span className="truncate">{session.attendees.join(", ")}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-start text-end">
        <Icon
          name="teacher"
          size={15}
          className={cn(
            "shrink-0",
            session.instructorName ? "text-ink-400" : "text-ink-300"
          )}
        />
        <span
          className={cn(
            "max-w-[8rem] truncate text-sm font-medium",
            session.instructorName ? "text-ink-700" : "text-ink-400"
          )}
        >
          {session.instructorName ?? "ללא מדריכה"}
        </span>
        {session.isSubstitute && (
          <Badge tone="warning" className="shrink-0">
            מחליפה
          </Badge>
        )}
      </div>
    </li>
  );
}

/** יום ושם חודש מקוצר לתצוגת "עלה בקלנדר" — למשל 5 · אוג. */
function dateChip(date: string): { day: number; month: string } {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    day: d.getUTCDate(),
    month: new Intl.DateTimeFormat("he-IL", {
      month: "short",
      timeZone: "UTC",
    }).format(d),
  };
}

function EnrollmentRow({
  enrollment,
  parentName,
  showDate,
}: {
  enrollment: EnrollmentRowData;
  parentName: string;
  showDate?: boolean;
}) {
  const schedule = classSchedule(enrollment.classes);

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink-900">
          {enrollmentTitle(enrollment)}
        </p>
        <p className="truncate text-sm text-ink-500">
          {enrollment.children?.full_name ?? parentName}
          {" · "}
          {schedule.day ?? ENROLLMENT_TYPE[enrollment.type]}
          {schedule.time && (
            <>
              {" · "}
              <span dir="ltr" className="tabular-nums">
                {schedule.time}
              </span>
            </>
          )}
        </p>
        {showDate && (
          <p className="mt-0.5 text-xs text-ink-400">
            נרשם ב-{formatDate(enrollment.created_at)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={ENROLLMENT_STATUS[enrollment.status].tone}>
          {ENROLLMENT_STATUS[enrollment.status].label}
        </Badge>
        <Badge tone={ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status].tone}>
          {ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status].label}
        </Badge>
      </div>
    </li>
  );
}

function PaymentRow({ payment }: { payment: PaymentRowData }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-semibold tabular-nums text-ink-900">
          {formatCurrency(payment.amount)}
        </p>
        <p className="truncate text-sm text-ink-500">
          {payment.payment_method
            ? PAYMENT_METHOD[payment.payment_method]
            : "אמצעי תשלום לא צוין"}
          {" · "}
          {formatDate(payment.paid_at ?? payment.created_at)}
        </p>
      </div>
      <Badge tone={PAYMENT_STATUS[payment.status].tone} className="shrink-0">
        {PAYMENT_STATUS[payment.status].label}
      </Badge>
    </li>
  );
}

function sumAmount(rows: { amount: number }[]): number {
  return rows.reduce((sum, row) => sum + Number(row.amount), 0);
}

function enrollmentTitle(enrollment: {
  type: Enums<"enrollment_type">;
  classes: { title: string } | null;
  programs: { title: string } | null;
  pool_passes: { title: string } | null;
}): string {
  return (
    enrollment.classes?.title ??
    enrollment.programs?.title ??
    enrollment.pool_passes?.title ??
    ENROLLMENT_TYPE[enrollment.type]
  );
}

/** "היום" / "מחר" / "ד׳ 12.8" — תווית קצרה לכרטיסי KPI. */
function whenLabel(date: string, today: string): string {
  if (date === today) return "היום";
  if (date === addDays(today, 1)) return "מחר";
  const day = new Date(`${date}T00:00:00Z`);
  return `${DAY_ABBR[day.getUTCDay()]} ${day.getUTCDate()}.${day.getUTCMonth() + 1}`;
}

/**
 * יום ושעות החוג בנפרד — טווח השעות מוצג בתוך רכיב LTR משלו,
 * אחרת שעת ההתחלה והסיום מתהפכות בתוך שורה בעברית.
 */
function classSchedule(
  classItem: {
    day_of_week: number | null;
    start_time: string | null;
    end_time: string | null;
  } | null
): { day: string | null; time: string | null } {
  if (!classItem) return { day: null, time: null };

  return {
    day:
      classItem.day_of_week !== null
        ? `יום ${DAY_ABBR[classItem.day_of_week]}`
        : null,
    time: classItem.start_time
      ? `${formatTime(classItem.start_time)}–${formatTime(classItem.end_time)}`
      : null,
  };
}

/** שורת הפתיחה בכרטיס הברכה — מותאמת למצב החשבון של ההורה. */
function heroLine({
  nextSession,
  today,
  openAmount,
  hasChildren,
  hasEnrollments,
}: {
  nextSession: AgendaSession | null;
  today: string;
  openAmount: number;
  hasChildren: boolean;
  hasEnrollments: boolean;
}): string {
  if (nextSession) {
    return `המפגש הבא: ${nextSession.title} · ${whenLabel(nextSession.date, today)} בשעה ${formatTime(nextSession.startTime)}`;
  }
  if (openAmount > 0) {
    return `נשארה יתרה של ${formatCurrency(openAmount)} להשלמה`;
  }
  if (!hasChildren && !hasEnrollments) {
    return "אפשר להוסיף ילדים לחשבון ולהירשם לחוג הראשון";
  }
  if (!hasEnrollments) {
    return "עוד לא נרשמתם לפעילות — כל החוגים פתוחים להרשמה";
  }
  return "אין מפגשים מתוכננים בקרוב";
}
