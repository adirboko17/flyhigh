import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { ChildrenPanel, type ParentChild } from "@/components/parent/ChildrenPanel";
import {
  UpcomingSessionsList,
  type AgendaSession,
} from "@/components/parent/UpcomingSessionsList";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { CancelInterestEnrollmentButton } from "@/components/parent/CancelInterestEnrollmentButton";
import { PayOpenChargeButton } from "@/components/payments/PayOpenChargeButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { ViewAllDialog } from "@/components/ui/ViewAllDialog";
import { requireProfile } from "@/lib/auth";
import { declarationSchoolYear } from "@/lib/health-declaration";
import {
  DAY_ABBR,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
  isCollectibleOpenCharge,
  isNonImmediatePaymentMethod,
  parentEnrollmentPaymentBadge,
  parentPaymentBadge,
  PAYMENT_METHOD,
} from "@/lib/constants";
import { isAbandonedCardcomEnrollment } from "@/lib/enrollment/holdsSeat";
import { addDays, dayLabelLong, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";

export const metadata = { title: "האזור האישי" };

/** כמה פריטים להציג בכרטיס עצמו — השאר נפתח ב"צפה בהכל". */
const AGENDA_LIMIT = 5;
const ENROLLMENTS_LIMIT = 4;
const PLANS_LIMIT = 4;
const PAYMENTS_LIMIT = 4;

/** עד כמה ימים קדימה מחפשים מפגשים ללוח "המפגשים הקרובים". */
const AGENDA_HORIZON_DAYS = 60;

export default async function ParentDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const today = todayInIsrael();
  const weekEnd = addDays(today, 6);
  const horizon = addDays(today, AGENDA_HORIZON_DAYS);

  const healthYear = declarationSchoolYear();
  const [
    { data: children },
    { data: enrollments },
    { data: payments },
    { data: receipts },
    { data: waitlist },
    { data: healthDeclarations },
  ] = await Promise.all([
    supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select(
        "*, people_count, classes(id, title, day_of_week, start_time, end_time, interest_only, booking_mode), class_sessions(session_date, start_time, end_time), programs(title, kind), pool_passes(title, entries_count), private_lessons(title, duration_minutes), children(full_name), private_lesson_slots(id, status, session_date, start_time, end_time), activity_bookings(id, status, session_date, start_time, end_time, people_count)"
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
      .select("id, child_id, classes(title), children(full_name)")
      .eq("status", "waiting"),
    supabase
      .from("health_declarations")
      .select(
        "id, child_id, parent_id, child_name, id_number, school_year, accepted, signed_at"
      )
      .eq("parent_id", profile.id)
      .eq("school_year", healthYear),
  ]);

  const allChildren = children ?? [];
  const allPayments = payments ?? [];
  const allEnrollments = (enrollments ?? []).filter((enrollment) => {
    const linked = allPayments.filter(
      (payment) => payment.enrollment_id === enrollment.id
    );
    return !isAbandonedCardcomEnrollment({
      status: enrollment.status,
      payment_status: enrollment.payment_status,
      payments: linked,
    });
  });
  const allReceipts = receipts ?? [];
  const waitingList = waitlist ?? [];

  // ההרשמות מופרדות לפי סוג: חוגים מוצגים עם לוח מפגשים, ומסלולים וכניסות
  // מקבלים כרטיס משלהם כי אין להם מפגשים קבועים.
  const classEnrollments = allEnrollments.filter((e) => e.type === "class");
  const planEnrollments = allEnrollments.filter((e) => e.type !== "class");
  const activePlans = planEnrollments.filter((e) => e.status === "active");

  const activeEnrollments = allEnrollments.filter((e) => e.status === "active");
  const pendingEnrollments = allEnrollments.filter((e) => e.status === "pending");
  const unpaidEnrollments = allEnrollments.filter(
    (e) =>
      e.status !== "cancelled" &&
      (e.payment_status === "unpaid" || e.payment_status === "partial")
  );
  const interestEnrollments = classEnrollments.filter(
    (e) => e.status !== "cancelled" && e.payment_status === "not_required"
  );

  const openPayments = allPayments.filter((p) =>
    isCollectibleOpenCharge(
      p.status,
      p.payment_method,
      p.external_reference,
      p.office_collection
    )
  );
  const openAmount = sumAmount(openPayments);
  const paidAmount = sumAmount(allPayments.filter((p) => p.status === "paid"));

  const paymentMethodByEnrollment = new Map<
    string,
    Enums<"payment_method"> | null
  >();
  for (const payment of allPayments) {
    if (
      payment.enrollment_id &&
      !paymentMethodByEnrollment.has(payment.enrollment_id)
    ) {
      paymentMethodByEnrollment.set(
        payment.enrollment_id,
        payment.payment_method
      );
    }
  }

  const allOpenAreDeferred =
    openPayments.length > 0 &&
    openPayments.every((payment) =>
      isNonImmediatePaymentMethod(payment.payment_method)
    );

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

  const declarationByChild = new Map(
    (healthDeclarations ?? []).map((declaration) => [
      declaration.child_id,
      declaration,
    ])
  );

  const kids: ParentChild[] = allChildren.map((child) => {
    const enrollmentCount = allEnrollments.filter(
      (enrollment) => enrollment.child_id === child.id
    ).length;
    const waitlistCount = waitingList.filter(
      (entry) => entry.child_id === child.id
    ).length;

    return {
      id: child.id,
      full_name: child.full_name,
      birth_date: child.birth_date,
      gender: child.gender,
      school_grade: child.school_grade,
      grade_school_year: child.grade_school_year,
      notes: child.notes,
      activities: activitiesByChild.get(child.id) ?? [],
      linkedRecords: enrollmentCount + waitlistCount,
      canDelete: enrollmentCount === 0 && waitlistCount === 0,
      healthDeclaration: declarationByChild.get(child.id) ?? null,
    };
  });
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
            `id, class_id, session_date, start_time, end_time, status, notes,
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
        classId: session.class_id,
        date: session.session_date,
        startTime: session.start_time,
        endTime: session.end_time,
        status: session.status,
        title: session.classes?.title ?? "חוג",
        attendees: attendeesByClass.get(session.class_id) ?? [],
        notes: session.notes,
        regularInstructorName: instructor,
        substituteInstructorName: substitute,
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
      title: allOpenAreDeferred
        ? "ממתין לאישור מנהל"
        : `יתרה לתשלום: ${formatCurrency(openAmount)}`,
      detail: allOpenAreDeferred
        ? `${openPayments.length} ${openPayments.length === 1 ? "רכישה" : "רכישות"} · ${formatCurrency(openAmount)} — המשרד יאשר עם קליטת התשלום`
        : openPayments.length === 1
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
    interestEnrollments.length > 0 && {
      icon: "📝",
      tone: "brand" as const,
      title: `${interestEnrollments.length} ${interestEnrollments.length === 1 ? "הרשמת עניין" : "הרשמות עניין"}`,
      detail: "נרשמתם בלי תשלום. כשהחוג ייפתח נעדכן לגבי התשלום",
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
    !profile.gender && {
      icon: "👤",
      tone: "amber" as const,
      title: "חסר מגדר בחשבון",
      detail: "בלי מגדר אי אפשר להירשם לחוגים לבנים או לבנות בלבד",
      href: "/parent/settings",
    },
    allChildren.length === 0 && {
      icon: "🧒",
      tone: "aqua" as const,
      title: "הוסיפו את הילדים שלכם",
      detail: "אחרי ההוספה תוכלו לרשום אותם לחוגים בלחיצה",
      href: "#children",
    },
    kids.some((kid) => !kid.healthDeclaration) && {
      icon: "🩺",
      tone: "amber" as const,
      title: "חסרה הצהרת בריאות",
      detail: "בלי הצהרה חתומה אי אפשר לרשום ילד/ה לחוג",
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
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient p-5 text-white shadow-glow sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-aqua-400/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70">
              {dayLabelLong(today)}
            </p>
            <h1 className="break-words font-display text-2xl font-extrabold sm:text-3xl">
              שלום, {profile.full_name} 👋
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {heroLine({
                nextSession,
                today,
                openAmount,
                allOpenAreDeferred,
                hasChildren: allChildren.length > 0,
                hasEnrollments: allEnrollments.length > 0,
              })}
            </p>
          </div>

          {/* כפתורים על גבי הגרדיאנט — ah-btn נותן את הצורה, והצבעים נקבעים כאן. */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/classes"
              className="ah-btn ah-btn--md flex-1 bg-white px-2 text-[11px] text-brand-700 hover:bg-white/90 sm:flex-none sm:px-5 sm:text-sm"
            >
              הרשמה לחוג חדש
            </Link>
            <Link
              href="/programs"
              className="ah-btn ah-btn--md flex-1 bg-white/15 px-2 text-[11px] text-white ring-1 ring-inset ring-white/30 hover:bg-white/25 sm:flex-none sm:px-5 sm:text-sm"
            >
              מנויים וכניסות
            </Link>
            <Link
              href="#children"
              className="ah-btn ah-btn--md flex-1 bg-white/15 px-2 text-[11px] text-white ring-1 ring-inset ring-white/30 hover:bg-white/25 sm:flex-none sm:px-5 sm:text-sm"
            >
              הילדים שלי
            </Link>
            <Link
              href="/parent/settings"
              className="ah-btn ah-btn--md flex-1 bg-white/15 px-2 text-[11px] text-white ring-1 ring-inset ring-white/30 hover:bg-white/25 sm:flex-none sm:px-5 sm:text-sm"
            >
              הגדרות
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
          label={allOpenAreDeferred ? "ממתין לאישור" : "יתרה לתשלום"}
          value={
            allOpenAreDeferred
              ? openPayments.length.toString()
              : formatCurrency(openAmount)
          }
          icon="💳"
          tone={openAmount > 0 ? "amber" : "aqua"}
          hint={
            openAmount > 0
              ? allOpenAreDeferred
                ? `${openPayments.length} ${openPayments.length === 1 ? "רכישה ממתינה" : "רכישות ממתינות"} לאישור מנהל`
                : `${openPayments.length} ${openPayments.length === 1 ? "חיוב פתוח" : "חיובים פתוחים"}`
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

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card id="schedule" className="min-w-0 scroll-mt-24 rounded-xl sm:rounded-2xl">
          <CardHeader className="px-3 py-3 sm:px-5 sm:py-4">
            <CardTitle className="break-words">המפגשים הקרובים</CardTitle>
            <ViewAllDialog
              title="לוח המפגשים"
              description={`כל המפגשים ב-${AGENDA_HORIZON_DAYS} הימים הקרובים`}
              count={upcomingSessions.length}
              disabled={upcomingSessions.length <= AGENDA_LIMIT}
            >
              <UpcomingSessionsList sessions={upcomingSessions} today={today} />
            </ViewAllDialog>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
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
              <UpcomingSessionsList sessions={previewSessions} today={today} />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl sm:rounded-2xl">
          <CardHeader className="px-3 py-3 sm:px-5 sm:py-4">
            <CardTitle className="break-words">מה כדאי לעשות</CardTitle>
            {tasks.length > 0 && <Badge tone="warning">{tasks.length}</Badge>}
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
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
                      className="flex min-w-0 items-start gap-2.5 rounded-lg border border-ink-100 px-3 py-2.5 transition-colors hover:border-ink-200 hover:bg-ink-50 sm:gap-3 sm:rounded-xl sm:px-3.5 sm:py-3"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm sm:h-9 sm:w-9 sm:text-base",
                          TASK_TONES[task.tone]
                        )}
                      >
                        {task.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-900">
                          {task.title}
                        </span>
                        <span className="block break-words text-xs text-ink-500">
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
            <CardTitle>ההרשמות לחוגים</CardTitle>
            <ViewAllDialog
              title="ההרשמות לחוגים"
              description="כל ההרשמות לחוגים בחשבון, כולל היסטוריה"
              count={classEnrollments.length}
              disabled={classEnrollments.length === 0}
            >
              <ul className="divide-y divide-ink-100">
                {classEnrollments.map((enrollment) => (
                  <EnrollmentRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    parentName={profile.full_name}
                    paymentMethod={paymentMethodByEnrollment.get(enrollment.id)}
                    showDate
                  />
                ))}
              </ul>
            </ViewAllDialog>
          </CardHeader>
          <CardContent>
            {classEnrollments.length === 0 ? (
              <EmptyState
                icon="📝"
                title="עדיין אין הרשמות לחוגים"
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
                {classEnrollments
                  .slice(0, ENROLLMENTS_LIMIT)
                  .map((enrollment) => (
                    <EnrollmentRow
                      key={enrollment.id}
                      enrollment={enrollment}
                      parentName={profile.full_name}
                      paymentMethod={paymentMethodByEnrollment.get(enrollment.id)}
                    />
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="plans" className="min-w-0 scroll-mt-24 rounded-xl sm:rounded-2xl">
        <CardHeader className="px-3 py-3 sm:px-5 sm:py-4">
          <CardTitle className="break-words">מנויים, כניסות ושיעורים פרטיים</CardTitle>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {activePlans.length > 0 && (
              <Badge tone="brand">{activePlans.length} פעילים</Badge>
            )}
            <ViewAllDialog
              title="מנויים, כניסות ושיעורים פרטיים"
              description="כל הרכישות שלכם לבריכה ולשיעורים פרטיים, כולל היסטוריה"
              count={planEnrollments.length}
              disabled={planEnrollments.length === 0}
            >
              <ul className="grid gap-3">
                {planEnrollments.map((enrollment) => (
                  <PlanRow
                    key={enrollment.id}
                    enrollment={enrollment}
                    parentName={profile.full_name}
                    paymentMethod={paymentMethodByEnrollment.get(enrollment.id)}
                  />
                ))}
              </ul>
            </ViewAllDialog>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-5">
          {planEnrollments.length === 0 ? (
            <EmptyState
              icon="🎫"
              title="עדיין לא רכשתם מנוי, כניסות או שיעור פרטי"
              description="מנוי, כרטיסייה או שיעור פרטי — הרכישה מתבצעת אונליין בכמה קליקים."
              action={
                <ButtonLink href="/programs" size="sm">
                  לבריכה ולשיעורים
                </ButtonLink>
              }
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="grid min-w-0 gap-2 sm:grid-cols-2 sm:gap-3">
              {planEnrollments.slice(0, PLANS_LIMIT).map((enrollment) => (
                <PlanRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  parentName={profile.full_name}
                  paymentMethod={paymentMethodByEnrollment.get(enrollment.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
        {planEnrollments.length > 0 && (
          <CardFooter className="flex flex-wrap items-center justify-between gap-2 bg-ink-50/60 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
            <span className="text-sm text-ink-600">
              רוצים להוסיף מנוי או כרטיסייה נוספת?
            </span>
            <ButtonLink href="/programs" size="sm" variant="outline">
              לרכישה
            </ButtonLink>
          </CardFooter>
        )}
      </Card>

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
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink-900">
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
                            className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
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
              {allOpenAreDeferred ? "ממתין לאישור מנהל" : "יתרה לתשלום"}{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  openAmount > 0 ? "text-amber-700" : "text-aqua-700"
                )}
              >
                {allOpenAreDeferred
                  ? `${openPayments.length} ${openPayments.length === 1 ? "רכישה" : "רכישות"}`
                  : formatCurrency(openAmount)}
              </span>
            </span>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

type EnrollmentRowData = {
  id: string;
  type: Enums<"enrollment_type">;
  status: Enums<"enrollment_status">;
  payment_status: Enums<"enrollment_payment_status">;
  created_at: string;
  ends_on?: string | null;
  people_count?: number | null;
  classes: {
    title: string;
    day_of_week: number | null;
    start_time: string | null;
    end_time: string | null;
    interest_only?: boolean | null;
    booking_mode?: "series" | "appointment" | null;
  } | null;
  class_sessions?: {
    session_date: string;
    start_time: string;
    end_time: string;
  } | null;
  programs: { title: string; kind?: "membership" | "activity" | null } | null;
  pool_passes: { title: string; entries_count: number } | null;
  private_lessons: { title: string; duration_minutes: number } | null;
  private_lesson_slots:
    | {
        id: string;
        status: Enums<"private_lesson_slot_status">;
        session_date: string | null;
        start_time: string | null;
        end_time: string | null;
      }[]
    | null;
  activity_bookings:
    | {
        id: string;
        status: Enums<"private_lesson_slot_status">;
        session_date: string | null;
        start_time: string | null;
        end_time: string | null;
        people_count: number;
      }[]
    | null;
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

function EnrollmentRow({
  enrollment,
  parentName,
  paymentMethod,
  showDate,
}: {
  enrollment: EnrollmentRowData;
  parentName: string;
  paymentMethod?: Enums<"payment_method"> | null;
  showDate?: boolean;
}) {
  const bookedSession = enrollment.class_sessions;
  const schedule = bookedSession
    ? {
        day: formatDate(bookedSession.session_date),
        time: `${formatTime(bookedSession.start_time)}–${formatTime(bookedSession.end_time)}`,
      }
    : classSchedule(enrollment.classes);
  const paymentBadge = parentEnrollmentPaymentBadge(
    enrollment.payment_status,
    paymentMethod
  );
  const interestOnly =
    enrollment.payment_status === "not_required" ||
    Boolean(enrollment.classes?.interest_only);
  const traineeName = enrollment.children?.full_name ?? parentName;
  const canCancelInterest =
    interestOnly && enrollment.status !== "cancelled";

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">
            {enrollmentTitle(enrollment)}
          </p>
          <p className="truncate text-sm text-ink-500">
            {traineeName}
            {" · "}
            {interestOnly
              ? "הרשמת עניין"
              : schedule.day ?? ENROLLMENT_TYPE[enrollment.type]}
            {!interestOnly && schedule.time && (
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
          <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
        </div>
      </div>
      {canCancelInterest && (
        <div className="rounded-xl bg-brand-50 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-brand-800">
            זו הרשמת עניין בלבד. כשהחוג ייפתח נעדכן לגבי התשלום.
          </p>
          <div className="mt-2">
            <CancelInterestEnrollmentButton
              enrollmentId={enrollment.id}
              classTitle={enrollment.classes?.title ?? "החוג"}
              traineeName={traineeName}
            />
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * מסלול או כרטיסיית כניסות שנרכשו. אין להם לוח מפגשים, ולכן מוצגים
 * כאריח עם המשתתף/ת, מועד הרכישה וסטטוס התשלום.
 */
function PlanRow({
  enrollment,
  parentName,
  paymentMethod,
}: {
  enrollment: EnrollmentRowData;
  parentName: string;
  paymentMethod?: Enums<"payment_method"> | null;
}) {
  const isPass = enrollment.type === "pool_pass";
  const isPrivate = enrollment.type === "private_lesson";
  const isActivity = enrollment.programs?.kind === "activity";
  const entries = enrollment.pool_passes?.entries_count ?? null;
  const duration = enrollment.private_lessons?.duration_minutes ?? null;
  const peopleCount = enrollment.people_count ?? null;
  const slots = enrollment.private_lesson_slots ?? [];
  const activityBookings = enrollment.activity_bookings ?? [];
  const awaitingSlots = [
    ...slots.filter((s) => s.status === "awaiting_schedule"),
    ...activityBookings.filter((s) => s.status === "awaiting_schedule"),
  ];
  const scheduledSlots = [
    ...slots.filter((s) => s.status === "scheduled" && s.session_date),
    ...activityBookings.filter((s) => s.status === "scheduled" && s.session_date),
  ].sort((a, b) =>
    (a.session_date ?? "").localeCompare(b.session_date ?? "")
  );
  const paymentBadge = parentEnrollmentPaymentBadge(
    enrollment.payment_status,
    paymentMethod
  );

  return (
    <li className="flex min-w-0 flex-wrap items-start gap-2.5 rounded-xl border border-ink-100 bg-white p-2.5 transition-colors hover:border-ink-200 sm:flex-nowrap sm:gap-3 sm:rounded-2xl sm:p-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base sm:h-11 sm:w-11 sm:rounded-xl sm:text-lg",
          isPrivate
            ? "bg-violet-100 text-violet-700"
            : isActivity
              ? "bg-amber-100 text-amber-700"
              : isPass
                ? "bg-aqua-100 text-aqua-700"
                : "bg-brand-100 text-brand-700"
        )}
      >
        {isPrivate ? "🎯" : isActivity ? "👨‍👩‍👧" : isPass ? "🎫" : "🏊"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-ink-900 sm:text-base">
          {enrollmentTitle(enrollment)}
        </p>
        <p className="truncate text-xs text-ink-500 sm:text-sm">
          {enrollment.children?.full_name ?? parentName}
          {" · "}
          {isActivity ? "פעילות" : ENROLLMENT_TYPE[enrollment.type]}
          {isPass && entries !== null && ` · ${entries} כניסות`}
          {isPrivate && duration !== null && ` · ${duration} דק׳`}
          {isPrivate && slots.length > 0 && ` · ${slots.length} שיעורים`}
          {isActivity && peopleCount !== null &&
            ` · ${peopleCount} ${peopleCount === 1 ? "משתתף" : "משתתפים"}`}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          נרכש ב-{formatDate(enrollment.created_at)}
          {enrollment.type === "program" && !isActivity && enrollment.ends_on
            ? ` · בתוקף עד ${formatDate(enrollment.ends_on)}`
            : ""}
        </p>
        {(isPrivate || isActivity) && awaitingSlots.length > 0 && (
          <p className="mt-1 text-xs font-medium text-amber-700">
            {isActivity
              ? "ממתין לתיאום מועד"
              : `ממתין לתיאום תאריך ושעה (${awaitingSlots.length})`}
          </p>
        )}
        {(isPrivate || isActivity) && scheduledSlots.length > 0 && (
          <p className="mt-1 text-xs text-ink-500">
            מתוזמן:{" "}
            {scheduledSlots
              .slice(0, 3)
              .map(
                (slot) =>
                  `${formatDate(slot.session_date!)} ${slot.start_time?.slice(0, 5) ?? ""}`
              )
              .join(" · ")}
            {scheduledSlots.length > 3 ? "…" : ""}
          </p>
        )}
      </div>

      <div className="flex basis-full flex-row flex-wrap items-center justify-end gap-1 sm:basis-auto sm:shrink-0 sm:flex-col sm:items-end">
        <Badge tone={ENROLLMENT_STATUS[enrollment.status].tone}>
          {ENROLLMENT_STATUS[enrollment.status].label}
        </Badge>
        <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
      </div>
    </li>
  );
}

function PaymentRow({ payment }: { payment: PaymentRowData }) {
  const paymentBadge = parentPaymentBadge(payment.status, payment.payment_method);
  const canPayNow =
    payment.status === "pending" && payment.payment_method === "credit_card";

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
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
        {canPayNow && <PayOpenChargeButton paymentId={payment.id} />}
      </div>
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
  private_lessons?: { title: string } | null;
}): string {
  return (
    enrollment.classes?.title ??
    enrollment.programs?.title ??
    enrollment.pool_passes?.title ??
    enrollment.private_lessons?.title ??
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
  allOpenAreDeferred,
  hasChildren,
  hasEnrollments,
}: {
  nextSession: AgendaSession | null;
  today: string;
  openAmount: number;
  allOpenAreDeferred: boolean;
  hasChildren: boolean;
  hasEnrollments: boolean;
}): string {
  if (nextSession) {
    return `המפגש הבא: ${nextSession.title} · ${whenLabel(nextSession.date, today)} בשעה ${formatTime(nextSession.startTime)}`;
  }
  if (openAmount > 0) {
    return allOpenAreDeferred
      ? "רכישה אחת או יותר ממתינות לאישור מנהל"
      : `נשארה יתרה של ${formatCurrency(openAmount)} להשלמה`;
  }
  if (!hasChildren && !hasEnrollments) {
    return "אפשר להוסיף ילדים לחשבון ולהירשם לחוג הראשון";
  }
  if (!hasEnrollments) {
    return "עוד לא נרשמתם לפעילות — כל החוגים פתוחים להרשמה";
  }
  return "אין מפגשים מתוכננים בקרוב";
}
