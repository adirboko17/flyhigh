"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import { SessionSubstituteDialog } from "@/components/admin/SessionSubstituteDialog";
import { CLASS_SESSION_STATUS, DAY_ABBR, DAYS_OF_WEEK } from "@/lib/constants";
import { dayLabelLong, type CalendarDay } from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";

export type CalendarSession = {
  id: string;
  /** חוג רגיל, שיעור פרטי מתוזמן או פעילות לפי נפשות. */
  kind: "class" | "private_lesson" | "activity";
  classId: string;
  title: string;
  category: string | null;
  /** המדריכה הקבועה של החוג. */
  instructorId: string | null;
  instructor: string | null;
  /** מדריכה מחליפה למפגש הזה בלבד. */
  substituteInstructorId: string | null;
  substituteInstructor: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  endTime: string;
  status: keyof typeof CLASS_SESSION_STATUS;
  notes: string | null;
  capacity: number;
  registered: number;
  /** לקוח/ילד בשיעור פרטי. */
  clientLabel?: string | null;
};

export const PRIVATE_LESSON_CALENDAR_GROUP = "private-lessons";
export const ACTIVITY_CALENDAR_GROUP = "activities";

function isBookedSession(kind: CalendarSession["kind"]) {
  return kind === "private_lesson" || kind === "activity";
}

export type CalendarView = "month" | "week";

type ClassColor = {
  chip: string;
  dot: string;
  ring: string;
};

/** צבע קבוע לכל חוג, כדי שיהיה אפשר לזהות אותו במבט אחד על הלוח. */
const CLASS_PALETTE: ClassColor[] = [
  { chip: "bg-sky-100 text-sky-900", dot: "bg-sky-500", ring: "ring-sky-300" },
  { chip: "bg-violet-100 text-violet-900", dot: "bg-violet-500", ring: "ring-violet-300" },
  { chip: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500", ring: "ring-emerald-300" },
  { chip: "bg-amber-100 text-amber-900", dot: "bg-amber-500", ring: "ring-amber-300" },
  { chip: "bg-rose-100 text-rose-900", dot: "bg-rose-500", ring: "ring-rose-300" },
  { chip: "bg-teal-100 text-teal-900", dot: "bg-teal-500", ring: "ring-teal-300" },
  { chip: "bg-indigo-100 text-indigo-900", dot: "bg-indigo-500", ring: "ring-indigo-300" },
  { chip: "bg-fuchsia-100 text-fuchsia-900", dot: "bg-fuchsia-500", ring: "ring-fuchsia-300" },
];

const FALLBACK_COLOR: ClassColor = {
  chip: "bg-ink-100 text-ink-800",
  dot: "bg-ink-400",
  ring: "ring-ink-300",
};

const MAX_CHIPS_PER_DAY = 3;

function durationMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} דק׳`;
  if (rest === 0) return `${hours} שע׳`;
  return `${hours}:${String(rest).padStart(2, "0")} שע׳`;
}

interface ClassCalendarProps {
  view: CalendarView;
  periodTitle: string;
  previousHref: string;
  nextHref: string;
  todayHref: string;
  isCurrentPeriod: boolean;
  previousLabel: string;
  nextLabel: string;
  monthViewHref: string;
  weekViewHref: string;
  today: string;
  days: CalendarDay[];
  sessions: CalendarSession[];
  instructors: { id: string; full_name: string }[];
}

export function ClassCalendar({
  view,
  periodTitle,
  previousHref,
  nextHref,
  todayHref,
  isCurrentPeriod,
  previousLabel,
  nextLabel,
  monthViewHref,
  weekViewHref,
  today,
  days,
  sessions,
  instructors,
}: ClassCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hiddenClasses, setHiddenClasses] = useState<string[]>([]);
  const [substituteFor, setSubstituteFor] = useState<CalendarSession | null>(null);

  const gridDates = useMemo(() => new Set(days.map((day) => day.date)), [days]);
  const periodSessions = useMemo(
    () =>
      view === "week"
        ? sessions.filter((session) => gridDates.has(session.date))
        : sessions,
    [view, sessions, gridDates]
  );

  const classes = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const session of periodSessions) {
      const title =
        session.kind === "private_lesson"
          ? "שיעורים פרטיים"
          : session.kind === "activity"
            ? "פעילויות"
            : session.title;
      const existing = map.get(session.classId);
      if (existing) existing.count += 1;
      else map.set(session.classId, { id: session.classId, title, count: 1 });
    }
    return [...map.values()]
      .sort((a, b) => a.title.localeCompare(b.title, "he"))
      .map((cls, index) => ({
        ...cls,
        color: CLASS_PALETTE[index % CLASS_PALETTE.length],
      }));
  }, [periodSessions]);

  const colorByClass = useMemo(
    () => new Map(classes.map((cls) => [cls.id, cls.color])),
    [classes]
  );

  const visibleSessions = useMemo(
    () =>
      periodSessions.filter((session) => !hiddenClasses.includes(session.classId)),
    [periodSessions, hiddenClasses]
  );

  /** המפגשים מגיעים מהשרת ממוינים לפי תאריך ושעה, כך שהקיבוץ שומר על הסדר. */
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const session of visibleSessions) {
      const list = map.get(session.date);
      if (list) list.push(session);
      else map.set(session.date, [session]);
    }
    return map;
  }, [visibleSessions]);

  const totalMinutes = visibleSessions.reduce(
    (sum, session) => sum + durationMinutes(session.startTime, session.endTime),
    0
  );
  const activeClassCount = new Set(visibleSessions.map((s) => s.classId)).size;
  const periodContainsToday = days.some(
    (day) => day.date === today && (view === "week" || day.inMonth)
  );
  const todaySessions = periodContainsToday ? sessionsByDate.get(today) ?? [] : null;

  useEffect(() => {
    if (!selectedDate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDate(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedDate]);

  function toggleClass(classId: string) {
    setHiddenClasses((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-gradient px-4 py-4 text-white sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70">
              {view === "week" ? "לוח החוגים השבועי" : "לוח החוגים החודשי"}
            </p>
            <h1 className="font-display text-xl font-bold leading-tight sm:text-3xl">
              {periodTitle}
            </h1>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
            <ViewToggle
              view={view}
              monthHref={monthViewHref}
              weekHref={weekViewHref}
            />
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <PeriodNavLink href={previousHref} label={previousLabel}>
                <ChevronIcon className="h-5 w-5 rotate-180" />
              </PeriodNavLink>
              <Link
                href={todayHref}
                aria-current={isCurrentPeriod ? "page" : undefined}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  isCurrentPeriod
                    ? "bg-white text-brand-700"
                    : "bg-white/15 text-white hover:bg-white/25"
                )}
              >
                היום
              </Link>
              <PeriodNavLink href={nextHref} label={nextLabel}>
                <ChevronIcon className="h-5 w-5" />
              </PeriodNavLink>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-ink-100 lg:grid-cols-4">
          <StatTile
            label={view === "week" ? "מפגשים השבוע" : "מפגשים החודש"}
            value={visibleSessions.length}
          />
          <StatTile label="חוגים פעילים" value={activeClassCount} />
          <StatTile label="שעות פעילות" value={formatDuration(totalMinutes)} />
          <StatTile
            label="היום"
            value={todaySessions === null ? "—" : todaySessions.length}
            hint={
              todaySessions === null
                ? view === "week"
                  ? "בשבוע אחר"
                  : "בחודש אחר"
                : "מפגשים מתוזמנים"
            }
          />
        </div>
      </Card>

      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => {
            const hidden = hiddenClasses.includes(cls.id);
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => toggleClass(cls.id)}
                aria-pressed={!hidden}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                  hidden
                    ? "border-ink-200 bg-white text-ink-400"
                    : "border-transparent bg-white text-ink-800 shadow-soft"
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    hidden ? "bg-ink-300" : cls.color.dot
                  )}
                />
                <span className={cn(hidden && "line-through")}>{cls.title}</span>
                <span className="rounded-full bg-ink-100 px-1.5 text-xs font-bold text-ink-600">
                  {cls.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {periodSessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="font-semibold text-ink-700">
              {view === "week"
                ? `אין מפגשים מתוזמנים בשבוע ${periodTitle}`
                : `אין מפגשים מתוזמנים ב${periodTitle}`}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              המפגשים נוצרים אוטומטית מלוח הזמנים שמוגדר בכל חוג.
            </p>
          </CardContent>
        </Card>
      )}

      {view === "week" ? (
        <WeekGrid
          days={days}
          sessionsByDate={sessionsByDate}
          colorByClass={colorByClass}
          onSelect={setSelectedDate}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/70">
            {DAYS_OF_WEEK.map((name, index) => (
              <div
                key={name}
                className="px-1 py-2.5 text-center text-xs font-bold text-ink-500"
              >
                <span className="hidden lg:inline">{name}</span>
                <span className="lg:hidden">{DAY_ABBR[index]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-ink-100">
            {days.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                sessions={sessionsByDate.get(day.date) ?? []}
                colorByClass={colorByClass}
                onSelect={() => setSelectedDate(day.date)}
              />
            ))}
          </div>
        </Card>
      )}

      {selectedDate && (
        <DayPanel
          date={selectedDate}
          sessions={sessionsByDate.get(selectedDate) ?? []}
          colorByClass={colorByClass}
          onClose={() => setSelectedDate(null)}
          onSubstitute={setSubstituteFor}
        />
      )}

      {substituteFor && substituteFor.kind === "class" && (
        <SessionSubstituteDialog
          open
          onClose={() => setSubstituteFor(null)}
          session={substituteFor}
          upcoming={upcomingSessionsOfClass(sessions, substituteFor)}
          instructors={instructors}
        />
      )}
    </div>
  );
}

/** מפגשים נוספים של אותו חוג בהמשך החודש, לשיבוץ החלפה של כמה שיעורים בבת אחת. */
function upcomingSessionsOfClass(
  sessions: CalendarSession[],
  session: CalendarSession
): CalendarSession[] {
  if (session.kind !== "class") return [];
  return sessions
    .filter(
      (other) =>
        other.kind === "class" &&
        other.classId === session.classId &&
        other.id !== session.id &&
        other.status !== "cancelled" &&
        other.date >= session.date
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 6);
}

function ViewToggle({
  view,
  monthHref,
  weekHref,
}: {
  view: CalendarView;
  monthHref: string;
  weekHref: string;
}) {
  return (
    <div
      role="group"
      aria-label="תצוגת לוח שנה"
      className="relative flex rounded-2xl bg-white/15 p-1 ring-1 ring-white/25 backdrop-blur-sm"
    >
      <ViewToggleLink href={monthHref} active={view === "month"} icon="calendar">
        חודש
      </ViewToggleLink>
      <ViewToggleLink href={weekHref} active={view === "week"} icon="week">
        שבוע
      </ViewToggleLink>
    </div>
  );
}

function ViewToggleLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: "calendar" | "week";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all sm:flex-none sm:px-4",
        active
          ? "bg-white text-brand-700 shadow-glow"
          : "text-white/85 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon name={icon} size={16} stroke={2} />
      {children}
    </Link>
  );
}

function WeekGrid({
  days,
  sessionsByDate,
  colorByClass,
  onSelect,
}: {
  days: CalendarDay[];
  sessionsByDate: Map<string, CalendarSession[]>;
  colorByClass: Map<string, ClassColor>;
  onSelect: (date: string) => void;
}) {
  return (
    <>
      <div className="space-y-3 lg:hidden">
        {days.map((day) => (
          <WeekDayCard
            key={day.date}
            day={day}
            sessions={sessionsByDate.get(day.date) ?? []}
            colorByClass={colorByClass}
            onSelect={() => onSelect(day.date)}
          />
        ))}
      </div>

      <Card className="hidden overflow-hidden p-0 lg:block">
        <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/70">
          {DAYS_OF_WEEK.map((name) => (
            <div
              key={name}
              className="px-2 py-2.5 text-center text-xs font-bold text-ink-500"
            >
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 items-stretch gap-px bg-ink-100">
          {days.map((day) => (
            <WeekDayColumn
              key={day.date}
              day={day}
              sessions={sessionsByDate.get(day.date) ?? []}
              colorByClass={colorByClass}
              onSelect={() => onSelect(day.date)}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

function WeekDayCard({
  day,
  sessions,
  colorByClass,
  onSelect,
}: {
  day: CalendarDay;
  sessions: CalendarSession[];
  colorByClass: Map<string, ClassColor>;
  onSelect: () => void;
}) {
  const hasSessions = sessions.length > 0;

  return (
    <Card className={cn("overflow-hidden", day.isToday && "ring-2 ring-brand-400")}>
      <button
        type="button"
        onClick={onSelect}
        disabled={!hasSessions}
        aria-label={`${dayLabelLong(day.date)} — ${sessions.length} מפגשים`}
        className={cn(
          "flex w-full flex-col gap-3 p-3 text-start",
          hasSessions && "hover:bg-brand-50/60",
          day.isWeekend && !day.isToday && "bg-brand-50/40"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-bold tabular-nums",
                day.isToday
                  ? "bg-brand-600 text-white shadow-glow"
                  : "bg-ink-100 text-ink-800"
              )}
            >
              {day.dayOfMonth}
            </span>
            <p className="font-display text-base font-bold leading-tight text-ink-900">
              {dayLabelLong(day.date)}
            </p>
          </div>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-600">
            {sessions.length} מפגשים
          </span>
        </div>

        {hasSessions ? (
          <div className="flex flex-col gap-1.5">
            {sessions.map((session) => (
              <WeekSessionChip
                key={session.id}
                session={session}
                color={colorByClass.get(session.classId) ?? FALLBACK_COLOR}
                expanded
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">אין מפגשים ביום זה</p>
        )}
      </button>
    </Card>
  );
}

function WeekDayColumn({
  day,
  sessions,
  colorByClass,
  onSelect,
}: {
  day: CalendarDay;
  sessions: CalendarSession[];
  colorByClass: Map<string, ClassColor>;
  onSelect: () => void;
}) {
  const hasSessions = sessions.length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!hasSessions}
      aria-label={`${dayLabelLong(day.date)} — ${sessions.length} מפגשים`}
      className={cn(
        "flex min-h-[28rem] flex-col gap-2 bg-white p-2 text-start transition-colors",
        day.isWeekend && "bg-brand-50/50",
        day.isToday && "bg-brand-50",
        hasSessions && "hover:bg-brand-50"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            day.isToday ? "bg-brand-600 text-white shadow-glow" : "text-ink-800"
          )}
        >
          {day.dayOfMonth}
        </span>
        {hasSessions && (
          <span className="text-[11px] font-semibold text-ink-400">
            {sessions.length}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {sessions.map((session) => (
          <WeekSessionChip
            key={session.id}
            session={session}
            color={colorByClass.get(session.classId) ?? FALLBACK_COLOR}
          />
        ))}
        {!hasSessions && (
          <p className="px-1 text-[11px] text-ink-300">אין מפגשים</p>
        )}
      </div>
    </button>
  );
}

function WeekSessionChip({
  session,
  color,
  expanded = false,
}: {
  session: CalendarSession;
  color: ClassColor;
  expanded?: boolean;
}) {
  const cancelled = session.status === "cancelled";
  const subtitle =
    isBookedSession(session.kind)
      ? session.clientLabel
      : session.substituteInstructor ?? session.instructor;

  return (
    <span
      className={cn(
        "flex flex-col gap-0.5 rounded-xl px-2 py-1.5 text-start text-[11px] font-medium leading-tight",
        cancelled ? "bg-ink-100 text-ink-400 line-through" : color.chip,
        expanded && "px-2.5 py-2 text-xs"
      )}
    >
      <span className="flex items-center gap-1">
        <span dir="ltr" className="shrink-0 font-bold tabular-nums">
          {session.startTime}
          {expanded ? `–${session.endTime}` : ""}
        </span>
        <span className={cn("min-w-0", expanded ? "" : "truncate")}>
          {session.title}
        </span>
        {session.substituteInstructor && (
          <span
            title={`מחליפה: ${session.substituteInstructor}`}
            className="shrink-0 font-bold text-amber-600"
          >
            ↺
          </span>
        )}
      </span>
      {subtitle && (
        <span className={cn("text-current/70", expanded ? "" : "truncate")}>
          {subtitle}
        </span>
      )}
    </span>
  );
}

function DayCell({
  day,
  sessions,
  colorByClass,
  onSelect,
}: {
  day: CalendarDay;
  sessions: CalendarSession[];
  colorByClass: Map<string, ClassColor>;
  onSelect: () => void;
}) {
  const hasSessions = sessions.length > 0;
  const chips = sessions.slice(0, MAX_CHIPS_PER_DAY);
  const hiddenCount = sessions.length - chips.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!hasSessions}
      aria-label={`${dayLabelLong(day.date)} — ${sessions.length} מפגשים`}
      className={cn(
        "flex min-h-[68px] flex-col gap-1 p-1 text-start transition-colors sm:min-h-[124px] sm:gap-1.5 sm:p-2 lg:min-h-[140px]",
        day.inMonth ? "bg-white" : "bg-ink-50/60",
        day.inMonth && day.isWeekend && "bg-brand-50/50",
        hasSessions && "hover:bg-brand-50"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums sm:h-7 sm:w-7 sm:text-sm",
            day.isToday
              ? "bg-brand-600 text-white shadow-glow"
              : day.inMonth
                ? "text-ink-800"
                : "text-ink-300"
          )}
        >
          {day.dayOfMonth}
        </span>
        {hasSessions && (
          <span className="text-[11px] font-semibold text-ink-400">
            {sessions.length}
          </span>
        )}
      </div>

      <div className="hidden min-w-0 flex-col gap-1 sm:flex">
        {chips.map((session) => {
          const color = colorByClass.get(session.classId) ?? FALLBACK_COLOR;
          const cancelled = session.status === "cancelled";
          return (
            <span
              key={session.id}
              className={cn(
                "flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium leading-tight",
                cancelled ? "bg-ink-100 text-ink-400 line-through" : color.chip
              )}
            >
              <span dir="ltr" className="shrink-0 font-bold tabular-nums">
                {session.startTime}
              </span>
              <span className="min-w-0 truncate">{session.title}</span>
              {session.substituteInstructor && (
                <span
                  title={`מחליפה: ${session.substituteInstructor}`}
                  className="shrink-0 font-bold text-amber-600"
                >
                  ↺
                </span>
              )}
            </span>
          );
        })}
        {hiddenCount > 0 && (
          <span className="px-1 text-[11px] font-bold text-brand-600">
            +{hiddenCount} נוספים
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 sm:hidden">
        {sessions.slice(0, 6).map((session) => (
          <span
            key={session.id}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              (colorByClass.get(session.classId) ?? FALLBACK_COLOR).dot
            )}
          />
        ))}
      </div>
    </button>
  );
}

function DayPanel({
  date,
  sessions,
  colorByClass,
  onClose,
  onSubstitute,
}: {
  date: string;
  sessions: CalendarSession[];
  colorByClass: Map<string, ClassColor>;
  onClose: () => void;
  onSubstitute: (session: CalendarSession) => void;
}) {
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + durationMinutes(session.startTime, session.endTime),
    0
  );
  const groups = groupSessionsByStart(sessions);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-title"
        className="relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card animate-fade-in"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 bg-brand-gradient px-5 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <h2 id="calendar-day-title" className="font-display text-xl font-bold sm:text-2xl">
              {dayLabelLong(date)}
            </h2>
            <p className="mt-0.5 text-sm text-white/80">
              {sessions.length} מפגשים · {formatDuration(totalMinutes)} פעילות
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="-me-1.5 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4">
          {sessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">
              אין מפגשים להצגה ביום זה.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <section key={group.startTime}>
                  {groups.length > 1 && (
                    <p
                      dir="ltr"
                      className="mb-1.5 px-1 text-xs font-bold tabular-nums text-ink-400"
                    >
                      {group.startTime}
                    </p>
                  )}
                  <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
                    {group.sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        color={colorByClass.get(session.classId) ?? FALLBACK_COLOR}
                        onSubstitute={() => onSubstitute(session)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function groupSessionsByStart(sessions: CalendarSession[]) {
  const groups: { startTime: string; sessions: CalendarSession[] }[] = [];
  for (const session of sessions) {
    const last = groups[groups.length - 1];
    if (last && last.startTime === session.startTime) {
      last.sessions.push(session);
    } else {
      groups.push({ startTime: session.startTime, sessions: [session] });
    }
  }
  return groups;
}

function sessionInstructorLabel(session: CalendarSession) {
  if (isBookedSession(session.kind)) {
    return session.clientLabel ?? null;
  }
  if (session.substituteInstructor) {
    return session.instructor
      ? `${session.substituteInstructor} במקום ${session.instructor}`
      : session.substituteInstructor;
  }
  return session.instructor;
}

function SessionRow({
  session,
  color,
  onSubstitute,
}: {
  session: CalendarSession;
  color: ClassColor;
  onSubstitute: () => void;
}) {
  const status = CLASS_SESSION_STATUS[session.status];
  const cancelled = session.status === "cancelled";
  const isPrivate = isBookedSession(session.kind);
  const instructorLabel = sessionInstructorLabel(session);
  const showStatus = session.status !== "scheduled";

  return (
    <li className="flex gap-2.5 px-3 py-2.5">
      <span
        className={cn(
          "w-1 shrink-0 self-stretch rounded-full",
          cancelled ? "bg-ink-200" : color.dot
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={cn(
              "min-w-0 truncate font-display text-sm font-bold text-ink-900",
              cancelled && "text-ink-400 line-through"
            )}
          >
            {session.title}
          </h3>
          <span
            dir="ltr"
            className="shrink-0 text-xs font-bold tabular-nums text-ink-600"
          >
            {session.startTime}–{session.endTime}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          {instructorLabel && (
            <span
              className={cn(
                "min-w-0 truncate",
                session.substituteInstructor && "font-semibold text-amber-700"
              )}
            >
              {instructorLabel}
            </span>
          )}
          {showStatus && <Badge tone={status.tone}>{status.label}</Badge>}
          {session.kind === "private_lesson" && (
            <Badge tone="brand">שיעור פרטי</Badge>
          )}
          {session.kind === "activity" && (
            <Badge tone="warning">פעילות</Badge>
          )}
          {!isPrivate && session.substituteInstructor && (
            <Badge tone="warning">החלפה</Badge>
          )}
          {!isPrivate && (
            <span className="tabular-nums text-ink-600">
              {session.registered}/{session.capacity}
            </span>
          )}
          {!isPrivate && !cancelled && (
            <button
              type="button"
              onClick={onSubstitute}
              className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
            >
              {session.substituteInstructor ? "עדכון החלפה" : "החלפה"}
            </button>
          )}
          <Link
            href={
              isPrivate
                ? "/admin/private-lessons"
                : `/admin/classes/${session.classId}/edit`
            }
            className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            {isPrivate ? "תיאום" : "החוג"}
          </Link>
        </div>

        {session.notes && (
          <p className="mt-1 truncate text-xs text-ink-400">{session.notes}</p>
        )}
      </div>
    </li>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function PeriodNavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25"
    >
      {children}
    </Link>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
