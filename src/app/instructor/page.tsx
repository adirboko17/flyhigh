import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ColumnChart } from "@/components/ui/Chart";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  InstructorClassCard,
  type InstructorClassData,
} from "@/components/instructor/InstructorClassCard";
import type { AttendanceRecord } from "@/components/instructor/ClassAttendanceHistory";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentInstructor } from "@/lib/auth";
import { dayLabel } from "@/lib/constants";
import { formatHours } from "@/lib/finance/payroll";
import { loadInstructorPayroll } from "@/lib/finance/instructorPayroll";
import {
  dayLabelLong,
  monthLabel,
  shortMonthLabel,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";
import { formatCurrency, formatTime } from "@/utils/format";

export const metadata = { title: "דשבורד מדריכה" };

const TREND_MONTHS = 6;

/** מספר הרשומות האחרונות בטבלת הנוכחות שנשלפות לצורך ההיסטוריה בכרטיסים. */
const ATTENDANCE_LIMIT = 500;

export default async function InstructorDashboard() {
  const profile = await requireRole(["instructor", "admin"]);
  const instructor = await getCurrentInstructor();
  const supabase = await createClient();

  const today = todayInIsrael();
  const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();

  const [{ data: ownedClasses }, { data: assignedSlots }, payroll] =
    await Promise.all([
      instructor
        ? supabase
            .from("classes")
            .select("*")
            .eq("instructor_id", instructor.id)
            .order("day_of_week")
        : Promise.resolve({ data: [] }),
      instructor
        ? supabase
            .from("class_weekly_slots")
            .select("id, class_id, day_of_week, start_time, end_time")
            .eq("instructor_id", instructor.id)
            .order("day_of_week")
            .order("start_time")
        : Promise.resolve({ data: [] }),
      loadInstructorPayroll(supabase, instructor, TREND_MONTHS),
    ]);

  const ownedIds = new Set((ownedClasses ?? []).map((cls) => cls.id));
  const extraClassIds = [
    ...new Set(
      (assignedSlots ?? [])
        .map((slot) => slot.class_id)
        .filter((classId) => !ownedIds.has(classId))
    ),
  ];
  const { data: extraClasses } =
    extraClassIds.length > 0
      ? await supabase.from("classes").select("*").in("id", extraClassIds)
      : { data: [] };

  const myClasses = [...(ownedClasses ?? []), ...(extraClasses ?? [])];
  const mySlotsByClass = new Map<string, typeof assignedSlots>();
  for (const slot of assignedSlots ?? []) {
    const list = mySlotsByClass.get(slot.class_id) ?? [];
    list.push(slot);
    mySlotsByClass.set(slot.class_id, list);
  }
  const classIds = myClasses.map((c) => c.id);

  const counts = new Map<string, number>();
  const studentsByClass = new Map<
    string,
    { id: string; full_name: string; weekly_slot_id?: string | null }[]
  >();
  const historyByClass = new Map<string, AttendanceRecord[]>();

  if (classIds.length > 0) {
    const [{ data: enrollments }, { data: attendanceRows }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("class_id, weekly_slot_id, children(id, full_name)")
        .in("class_id", classIds)
        .eq("status", "active"),
      supabase
        .from("attendance")
        .select("class_id, child_id, date, status, children(full_name)")
        .in("class_id", classIds)
        .order("date", { ascending: false })
        .limit(ATTENDANCE_LIMIT),
    ]);

    (enrollments ?? []).forEach((e) => {
      if (!e.class_id || !e.children) return;
      counts.set(e.class_id, (counts.get(e.class_id) ?? 0) + 1);
      const list = studentsByClass.get(e.class_id) ?? [];
      list.push({
        id: e.children.id,
        full_name: e.children.full_name,
        weekly_slot_id: e.weekly_slot_id,
      });
      studentsByClass.set(e.class_id, list);
    });

    (attendanceRows ?? []).forEach((row) => {
      if (!row.class_id || !row.children) return;
      const list = historyByClass.get(row.class_id) ?? [];
      list.push({
        date: row.date,
        childId: row.child_id,
        childName: row.children.full_name,
        status: row.status,
      });
      historyByClass.set(row.class_id, list);
    });
  }

  const studentCount = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const totalCapacity = myClasses.reduce((sum, c) => sum + (c.capacity ?? 0), 0);
  const fillRate =
    totalCapacity > 0 ? Math.round((studentCount / totalCapacity) * 100) : null;

  const classCards: InstructorClassData[] = myClasses
    .map((c) => {
      const mySlots = mySlotsByClass.get(c.id) ?? [];
      const todaySlot = mySlots.find((slot) => slot.day_of_week === todayWeekday);
      const displaySlot = todaySlot ?? mySlots[0];
      const dayOfWeek = displaySlot?.day_of_week ?? c.day_of_week;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        dayOfWeek,
        startTime: displaySlot?.start_time ?? c.start_time,
        endTime: displaySlot?.end_time ?? c.end_time,
        capacity: c.capacity,
        studentCount: counts.get(c.id) ?? 0,
        students: studentsByClass.get(c.id) ?? [],
        attendanceHistory: historyByClass.get(c.id) ?? [],
        isToday: dayOfWeek === todayWeekday && c.status === "active",
      };
    })
    // החוגים של היום עולים לראש הרשימה, ואחריהם השאר לפי סדר השבוע והשעה.
    .sort((a, b) => {
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
      const dayDiff = weekOrder(a.dayOfWeek, todayWeekday) - weekOrder(b.dayOfWeek, todayWeekday);
      if (dayDiff !== 0) return dayDiff;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });

  const todayClasses = classCards.filter((c) => c.isToday);
  const nextClass = classCards.find((c) => !c.isToday && c.status === "active");

  const { thisMonth, previousMonth, monthlySummary, currentMonth, rate, payType } = payroll;
  const monthDiff = previousMonth ? thisMonth.amount - previousMonth.amount : 0;

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

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70">
              {dayLabelLong(today)}
            </p>
            <h1 className="break-words font-display text-2xl font-extrabold sm:text-3xl">
              שלום, {profile.full_name} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/85">
              {heroLine({ todayClasses, nextClass, hasClasses: myClasses.length > 0 })}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <HeroPill label="חוגים" value={String(myClasses.length)} />
              <HeroPill label="תלמידים" value={String(studentCount)} />
              <HeroPill
                label="מפגשים החודש"
                value={String(thisMonth.sessions)}
              />
            </div>
          </div>

          <div className="w-full shrink-0 rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/25 backdrop-blur-sm sm:p-5 lg:w-72">
            <p className="text-xs font-medium text-white/70">
              שכר {monthLabel(currentMonth)}
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold leading-tight">
              {formatCurrency(thisMonth.amount)}
            </p>
            <p className="mt-1 text-xs text-white/80">
              {formatHours(thisMonth.hours)}
              {rate > 0 &&
                ` · ${formatCurrency(rate)} ${payType === "monthly" ? "לחודש" : "לשעה"}`}
            </p>

            {previousMonth && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-white/85">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    monthDiff >= 0 ? "bg-white/20" : "bg-black/20"
                  )}
                >
                  {monthDiff >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(monthDiff))}
                </span>
                מול {shortMonthLabel(previousMonth.month)}
              </p>
            )}

            <Link
              href="/instructor/payroll"
              className="mt-4 inline-flex text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              לפירוט השכר המלא
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <section className="order-1 sm:order-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink-900">
              החוגים שלי
            </h2>
            <div className="flex items-center gap-2">
              {todayClasses.length > 0 && (
                <Badge tone="brand">{todayClasses.length} היום</Badge>
              )}
              <span className="hidden text-xs text-ink-400 sm:inline">
                לחיצה על חוג לסימון נוכחות או לצפייה בהיסטוריה
              </span>
            </div>
          </div>

          {classCards.length > 0 && instructor ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {classCards.map((classData) => (
                <InstructorClassCard
                  key={classData.id}
                  classData={classData}
                  instructorId={instructor.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="אין חוגים משויכים"
              description="פני למנהל המערכת לשיוך חוגים."
              icon="🏊"
            />
          )}
        </section>

        <div className="order-2 grid gap-4 sm:order-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="החוגים שלי"
            value={myClasses.length}
            icon="🏊"
            tone="brand"
            hint={
              todayClasses.length > 0
                ? `${todayClasses.length} ${todayClasses.length === 1 ? "חוג מתקיים היום" : "חוגים מתקיימים היום"}`
                : nextClass
                  ? `הבא: יום ${dayLabel(nextClass.dayOfWeek)}`
                  : "אין חוגים משויכים"
            }
          />
          <StatCard
            label="תלמידים פעילים"
            value={studentCount}
            icon="🧒"
            tone="aqua"
            hint={fillRate !== null ? `תפוסה ${fillRate}% מהמקומות` : undefined}
          />
          <StatCard
            label="שעות החודש"
            value={formatHours(thisMonth.hours)}
            icon="⏱️"
            tone="amber"
            hint={`${thisMonth.sessions} מפגשים שהתקיימו`}
          />
          <StatCard
            label={payType === "monthly" ? "שכר חודשי" : "תעריף שעתי"}
            value={rate > 0 ? formatCurrency(rate) : "-"}
            icon="💰"
            tone="violet"
            hint={
              payType === "monthly"
                ? "שכר קבוע בכל חודש"
                : "השכר מחושב משעות המפגשים בפועל"
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>מגמת שכר</CardTitle>
          <span className="text-xs text-ink-400">
            {TREND_MONTHS} החודשים האחרונים
          </span>
        </CardHeader>
        <CardContent>
          <ColumnChart
            series={[{ name: "שכר", className: "bg-violet-400" }]}
            data={monthlySummary.map((entry) => ({
              key: entry.month,
              label: shortMonthLabel(entry.month),
              values: [entry.amount],
              active: entry.month === currentMonth,
            }))}
            formatValue={formatCurrency}
            emptyLabel="אין נתוני שכר להצגה"
          />
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ink-500">
            סה״כ {TREND_MONTHS} חודשים:{" "}
            <span className="font-semibold text-ink-800">
              {formatCurrency(
                monthlySummary.reduce((sum, entry) => sum + entry.amount, 0)
              )}
            </span>
          </span>
          <Link
            href="/instructor/payroll"
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            פירוט חודשי ומפגשים
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs ring-1 ring-inset ring-white/20">
      <span className="font-display text-sm font-bold tabular-nums">{value}</span>
      <span className="text-white/75">{label}</span>
    </span>
  );
}

/** מרחק היום בשבוע מהיום הנוכחי, כדי שהחוגים הקרובים יופיעו ראשונים. */
function weekOrder(dayOfWeek: number | null, todayWeekday: number): number {
  if (dayOfWeek === null) return 99;
  return (dayOfWeek - todayWeekday + 7) % 7;
}

function heroLine({
  todayClasses,
  nextClass,
  hasClasses,
}: {
  todayClasses: InstructorClassData[];
  nextClass: InstructorClassData | undefined;
  hasClasses: boolean;
}): string {
  if (todayClasses.length > 0) {
    const first = todayClasses[0];
    const suffix = first.startTime ? ` בשעה ${formatTime(first.startTime)}` : "";
    return todayClasses.length === 1
      ? `היום יש לך את ${first.title}${suffix}.`
      : `היום יש לך ${todayClasses.length} חוגים — הראשון ${first.title}${suffix}.`;
  }

  if (nextClass) {
    const suffix = nextClass.startTime
      ? ` בשעה ${formatTime(nextClass.startTime)}`
      : "";
    return `אין חוגים היום. הבא בתור: ${nextClass.title}, יום ${dayLabel(nextClass.dayOfWeek)}${suffix}.`;
  }

  return hasClasses
    ? "אין חוגים פעילים בלוח שלך כרגע."
    : "עדיין לא שויכו אליך חוגים.";
}
