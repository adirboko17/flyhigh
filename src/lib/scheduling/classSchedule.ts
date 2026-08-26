import { parseAgeBoundInput } from "@/lib/age-range";
import {
  CLASS_GENDER_POLICY,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { DAY_ABBR, DAYS_OF_WEEK } from "@/lib/constants";
import { classPeriodTotal, parseBillingMonths } from "@/lib/finance/classPricing";
import { prorateClassPrice } from "@/lib/finance/proratedClassPrice";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import {
  UNLIMITED_AVAILABLE_SENTINEL,
  isUnlimitedCapacity,
} from "@/lib/classes/capacity";
import type { PublicClass } from "@/types";

export type ScheduleType = "weekly" | "custom";

export type WeeklySlot = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  genderPolicy: ClassGenderPolicy;
  note?: string;
};

export function weeklySlotKey(slot: Pick<WeeklySlot, "dayOfWeek" | "startTime">) {
  return `${slot.dayOfWeek}|${slot.startTime.slice(0, 5)}`;
}

export function formatWeeklySlotLabel(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  genderPolicy?: ClassGenderPolicy | null
) {
  const start = startTime.slice(0, 5);
  const end = endTime.slice(0, 5);
  const base = `יום ${DAYS_OF_WEEK[dayOfWeek] ?? dayOfWeek} · ${start}–${end}`;
  return genderPolicy ? `${base} · ${CLASS_GENDER_POLICY[genderPolicy]}` : base;
}

export function genderPolicyFromWeeklySlots(
  slots: WeeklySlot[]
): ClassGenderPolicy {
  const genders = [...new Set(slots.map((slot) => slot.genderPolicy ?? "mixed"))];
  return genders.length === 1 ? genders[0]! : "mixed";
}

export function parseSessionCount(
  value: string | number | null | undefined
): number | null {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 80) return null;
  return n;
}

export type ClassSessionDraft = {
  id?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "cancelled" | "completed";
  notes?: string;
};

export type ClassScheduleState = {
  scheduleType: ScheduleType;
  weeklySlots: WeeklySlot[];
  rangeStart: string;
  rangeEnd: string;
  sessionCount: string;
  sessions: ClassSessionDraft[];
};

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function firstOnOrAfter(start: Date, dayOfWeek: number): Date {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const delta = (dayOfWeek - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + delta);
  return cursor;
}

export function lastSessionDate(sessions: ClassSessionDraft[]): string {
  return sessions.reduce(
    (latest, session) =>
      session.sessionDate > latest ? session.sessionDate : latest,
    ""
  );
}

export function generateWeeklySessions(
  slots: WeeklySlot[],
  rangeStart: string,
  rangeEnd?: string | null,
  sessionCount?: number | null
): ClassSessionDraft[] {
  if (!rangeStart || slots.length === 0) return [];

  const usableSlots = slots.filter(
    (slot) => slot.startTime.trim() && slot.endTime.trim()
  );
  if (usableSlots.length === 0) return [];

  const start = parseLocalDate(rangeStart);
  const count = parseSessionCount(sessionCount);
  const sessions: ClassSessionDraft[] = [];

  if (count) {
    for (const slot of usableSlots) {
      const cursor = firstOnOrAfter(start, slot.dayOfWeek);
      for (let i = 0; i < count; i++) {
        sessions.push({
          sessionDate: formatLocalDate(cursor),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "scheduled",
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    }
  } else {
    if (!rangeEnd) return [];
    const end = parseLocalDate(rangeEnd);
    if (start > end) return [];

    const cursor = new Date(start);
    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      const daySlots = usableSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
      for (const slot of daySlots) {
        sessions.push({
          sessionDate: formatLocalDate(cursor),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "scheduled",
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return sessions.sort(
    (a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) ||
      a.startTime.localeCompare(b.startTime)
  );
}

export function refreshWeeklySessions(
  schedule: ClassScheduleState
): ClassScheduleState {
  if (schedule.scheduleType !== "weekly") return schedule;

  const count = parseSessionCount(schedule.sessionCount);
  const generated = generateWeeklySessions(
    schedule.weeklySlots,
    schedule.rangeStart,
    schedule.rangeEnd,
    count
  );

  if (generated.length === 0) {
    return count ? schedule : { ...schedule, sessions: [] };
  }

  return {
    ...schedule,
    sessions: mergeGeneratedSessions(schedule.sessions, generated),
    rangeEnd: lastSessionDate(generated) || schedule.rangeEnd,
  };
}

export function ensureWeeklySessions(
  schedule: ClassScheduleState
): ClassScheduleState {
  if (schedule.scheduleType !== "weekly") return schedule;
  const hasActive = schedule.sessions.some((session) => session.status !== "cancelled");
  if (hasActive) return schedule;
  return refreshWeeklySessions(schedule);
}

export function mergeGeneratedSessions(
  existing: ClassSessionDraft[],
  generated: ClassSessionDraft[]
): ClassSessionDraft[] {
  const sessionKey = (session: ClassSessionDraft) =>
    `${session.sessionDate}|${session.startTime.slice(0, 5)}`;
  const existingByKey = new Map(
    existing.map((session) => [sessionKey(session), session]),
  );
  const usedKeys = new Set<string>();

  const merged = generated.map((generatedSession) => {
    const key = sessionKey(generatedSession);
    const prev = existingByKey.get(key);
    usedKeys.add(key);
    if (!prev) return generatedSession;

    return {
      ...generatedSession,
      id: prev.id,
      status: prev.status,
      notes: prev.notes,
    };
  });

  // מפגשים ידניים/מבוטלים שלא נוצרו מחדש מהטווח נשארים ברשימה.
  for (const session of existing) {
    if (usedKeys.has(sessionKey(session))) continue;
    if (session.status === "cancelled" || session.id) {
      merged.push(session);
    }
  }

  return merged.sort(
    (a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) ||
      a.startTime.localeCompare(b.startTime),
  );
}

export function formatWeeklyDays(days: number[]): string {
  return [...new Set(days)]
    .sort((a, b) => a - b)
    .map((d) => DAY_ABBR[d] ?? DAYS_OF_WEEK[d])
    .join(", ");
}

export function formatScheduleSummary(
  scheduleType: ScheduleType,
  weeklySlots: WeeklySlot[],
  sessions: ClassSessionDraft[]
): string {
  const active = sessions.filter((s) => s.status !== "cancelled");

  if (scheduleType === "custom") {
    if (active.length === 0) return "תאריכים מותאמים";
    return `${active.length} מפגשים · תאריכים מותאמים`;
  }

  if (weeklySlots.length > 1) {
    const label = `${weeklySlots.length} מועדים בשבוע`;
    return active.length > 0 ? `${label} · ${active.length} מפגשים` : label;
  }

  const days = formatWeeklyDays(weeklySlots.map((s) => s.dayOfWeek));
  const uniqueTimes = [
    ...new Set(
      weeklySlots.map(
        (slot) =>
          `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`,
      ),
    ),
  ];
  const times =
    uniqueTimes.length === 1
      ? uniqueTimes[0]
      : uniqueTimes.length > 1
        ? "שעות משתנות"
        : "";

  if (active.length > 0) {
    return `${days}${times ? ` · ${times}` : ""} · ${active.length} מפגשים`;
  }

  return days ? `${days}${times ? ` · ${times}` : ""}` : "לוח זמנים שבועי";
}

export function syncLegacyClassFields(
  scheduleType: ScheduleType,
  weeklySlots: WeeklySlot[],
  sessions: ClassSessionDraft[]
) {
  const active = sessions
    .filter((s) => s.status !== "cancelled")
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  const sortedSlots = [...weeklySlots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek
  );
  const primarySlot = sortedSlots[0];
  const primarySession = active[0];
  const lastSession = active[active.length - 1];

  return {
    schedule_type: scheduleType,
    day_of_week: primarySlot?.dayOfWeek ?? null,
    start_time: primarySlot?.startTime ?? primarySession?.startTime ?? null,
    end_time: primarySlot?.endTime ?? primarySession?.endTime ?? null,
    start_date: primarySession?.sessionDate ?? null,
    end_date: lastSession?.sessionDate ?? null,
  };
}

export const emptyScheduleState = (): ClassScheduleState => ({
  scheduleType: "weekly",
  weeklySlots: [
    { dayOfWeek: 1, startTime: "16:00", endTime: "16:45", genderPolicy: "mixed" },
  ],
  rangeStart: "",
  rangeEnd: "",
  sessionCount: "",
  sessions: [],
});

export function sessionWeekday(sessionDate: string) {
  const [year, month, day] = sessionDate.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function sessionSlotKey(session: Pick<ClassSessionDraft, "sessionDate" | "startTime">) {
  return weeklySlotKey({
    dayOfWeek: sessionWeekday(session.sessionDate),
    startTime: session.startTime,
  });
}

export type SessionSlotGroup = {
  key: string;
  slot: WeeklySlot | null;
  items: { session: ClassSessionDraft; index: number }[];
};

export function groupSessionsByWeeklySlot(
  slots: WeeklySlot[],
  sessions: ClassSessionDraft[]
): SessionSlotGroup[] {
  const groups = new Map<string, SessionSlotGroup>();

  for (const slot of slots) {
    const key = weeklySlotKey(slot);
    groups.set(key, { key, slot, items: [] });
  }

  const unmatched: SessionSlotGroup = {
    key: "unmatched",
    slot: null,
    items: [],
  };

  sessions.forEach((session, index) => {
    if (!session.sessionDate) {
      unmatched.items.push({ session, index });
      return;
    }
    const key = sessionSlotKey(session);
    const group = groups.get(key);
    if (group) group.items.push({ session, index });
    else unmatched.items.push({ session, index });
  });

  const byDate = (
    a: SessionSlotGroup["items"][number],
    b: SessionSlotGroup["items"][number]
  ) =>
    a.session.sessionDate.localeCompare(b.session.sessionDate) ||
    a.session.startTime.localeCompare(b.session.startTime);

  const result = [...groups.values()].filter((group) => group.items.length > 0);
  for (const group of result) group.items.sort(byDate);
  if (unmatched.items.length > 0) {
    unmatched.items.sort(byDate);
    result.push(unmatched);
  }
  return result;
}

export function nextWeeklySessionDate(
  slot: Pick<WeeklySlot, "dayOfWeek">,
  lastDate: string | null | undefined,
  rangeStart: string
): string {
  if (lastDate) {
    const cursor = parseLocalDate(lastDate);
    cursor.setDate(cursor.getDate() + 7);
    return formatLocalDate(cursor);
  }
  if (!rangeStart) return "";
  return formatLocalDate(firstOnOrAfter(parseLocalDate(rangeStart), slot.dayOfWeek));
}

function inferSessionCount(slots: WeeklySlot[], sessions: ClassSessionDraft[]): string {
  const first = slots[0];
  if (!first) return "";
  const start = first.startTime.slice(0, 5);
  const matching = sessions.filter((session) => {
    if (session.status === "cancelled") return false;
    if (session.startTime.slice(0, 5) !== start) return false;
    return sessionWeekday(session.sessionDate) === first.dayOfWeek;
  });
  return matching.length > 0 ? String(matching.length) : "";
}

export function weeklySlotsFromDb(
  rows: {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    gender_policy?: ClassGenderPolicy | null;
    note?: string | null;
  }[]
): WeeklySlot[] {
  return rows
    .map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      genderPolicy: r.gender_policy ?? "mixed",
      note: r.note?.trim() || undefined,
    }))
    .sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
    );
}

export function sessionsFromDb(
  rows: {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    status: "scheduled" | "cancelled" | "completed";
    notes: string | null;
  }[]
): ClassSessionDraft[] {
  return rows
    .map((r) => ({
      id: r.id,
      sessionDate: r.session_date,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
      status: r.status,
      notes: r.notes ?? undefined,
    }))
    .sort(
      (a, b) =>
        a.sessionDate.localeCompare(b.sessionDate) ||
        a.startTime.localeCompare(b.startTime)
    );
}

export function formToPreviewClass(
  form: {
    title: string;
    description: string;
    category: string;
    level: string;
    gender_policy: PublicClass["gender_policy"];
    audience_type: PublicClass["audience_type"];
    age_min: string;
    age_max: string;
    age_min_unit?: "years" | "months";
    age_max_unit?: "years" | "months";
    grade_min: string;
    grade_max: string;
    capacity: string;
    capacity_limited?: boolean;
    price: string;
    billing_months?: string;
    planned_session_count?: string;
    price_mode?: "period" | "monthly";
    pick_one_slot?: boolean;
    interest_only?: boolean;
  },
  schedule: ClassScheduleState,
  imageUrl: string | null,
  instructorName: string | null,
  instructorGender: PublicClass["instructor_gender"] = null,
  previewStatus: PublicClass["status"] = "active"
): PublicClass {
  const capacity =
    form.capacity_limited === false ? null : Number(form.capacity) || 10;
  const interestOnly = Boolean(form.interest_only);
  const legacy = syncLegacyClassFields(
    schedule.scheduleType,
    schedule.weeklySlots,
    schedule.sessions
  );
  const activeSessions = interestOnly
    ? []
    : schedule.sessions.filter((s) => s.status !== "cancelled");
  const billingMonths = interestOnly
    ? null
    : form.price_mode === "monthly"
      ? parseBillingMonths(Number(form.billing_months))
      : null;
  const plannedSessions = interestOnly
    ? parseSessionCount(form.planned_session_count)
    : null;
  const proration = interestOnly
    ? prorateClassPrice(Number(form.price) || 0, [], todayInIsrael())
    : prorateClassPrice(
        classPeriodTotal(Number(form.price) || 0, billingMonths),
        schedule.sessions.map((session) => ({
          session_date: session.sessionDate,
          start_time: session.startTime,
          status: session.status,
        })),
        todayInIsrael()
      );
  const isGrade = form.audience_type === "grade";
  const isOpen = form.audience_type === "open";

  return {
    id: "preview",
    title: form.title || "שם החוג",
    description: form.description || "",
    category: form.category || "",
    level: form.level || "",
    gender_policy:
      !interestOnly &&
      schedule.scheduleType === "weekly" &&
      schedule.weeklySlots.length > 0
        ? genderPolicyFromWeeklySlots(schedule.weeklySlots)
        : form.gender_policy || "mixed",
    audience_type: form.audience_type || "age",
    age_min: (isOpen || isGrade
      ? null
      : parseAgeBoundInput(form.age_min, form.age_min_unit ?? "years")) as PublicClass["age_min"],
    age_max: (isOpen || isGrade
      ? null
      : parseAgeBoundInput(form.age_max, form.age_max_unit ?? "years")) as PublicClass["age_max"],
    grade_min: isGrade && form.grade_min ? Number(form.grade_min) : 0,
    grade_max: isGrade && form.grade_max ? Number(form.grade_max) : 0,
    capacity,
    billing_months: billingMonths,
    pick_one_slot: interestOnly ? false : form.pick_one_slot ?? true,
    price: Number(form.price) || 0,
    start_date: interestOnly ? "" : legacy.start_date ?? "",
    end_date: interestOnly ? "" : legacy.end_date ?? "",
    day_of_week: interestOnly ? 0 : legacy.day_of_week ?? 0,
    start_time: interestOnly ? "" : legacy.start_time ?? "",
    end_time: interestOnly ? "" : legacy.end_time ?? "",
    status: previewStatus,
    image_url: imageUrl ?? "",
    instructor_name: instructorName ?? "",
    instructor_gender: instructorGender,
    taken_count: 0,
    available: isUnlimitedCapacity(capacity)
      ? UNLIMITED_AVAILABLE_SENTINEL
      : capacity ?? 0,
    schedule_type: schedule.scheduleType,
    schedule_days: interestOnly
      ? ""
      : schedule.scheduleType === "custom"
        ? ""
        : formatWeeklyDays(schedule.weeklySlots.map((s) => s.dayOfWeek)) || "",
    session_count: interestOnly ? plannedSessions ?? 0 : activeSessions.length,
    billable_session_count: interestOnly
      ? plannedSessions ?? 0
      : proration.billableCount,
    remaining_session_count: interestOnly
      ? plannedSessions ?? 0
      : proration.remainingCount,
    interest_only: interestOnly,
    weekly_slots: interestOnly
      ? []
      : schedule.weeklySlots
          .filter((slot) => slot.startTime.trim())
          .map((slot) => ({
            day_of_week: slot.dayOfWeek,
            start_time: slot.startTime,
            end_time: slot.endTime,
            gender_policy: slot.genderPolicy,
            note: slot.note?.trim() || null,
          })),
  };
}

export function buildInitialSchedule(
  classItem: {
    schedule_type?: ScheduleType | null;
    day_of_week?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    gender_policy?: ClassGenderPolicy | null;
  },
  slotRows: {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    gender_policy?: ClassGenderPolicy | null;
    note?: string | null;
  }[],
  sessionRows: {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    status: "scheduled" | "cancelled" | "completed";
    notes: string | null;
  }[]
): ClassScheduleState {
  const scheduleType = classItem.schedule_type ?? "weekly";
  const weeklySlots =
    slotRows.length > 0
      ? weeklySlotsFromDb(slotRows)
      : classItem.day_of_week != null
        ? [
            {
              dayOfWeek: classItem.day_of_week,
              startTime: classItem.start_time?.slice(0, 5) ?? "",
              endTime: classItem.end_time?.slice(0, 5) ?? "",
              genderPolicy: classItem.gender_policy ?? "mixed",
            },
          ]
        : [];
  const sessions = sessionsFromDb(sessionRows);

  return {
    scheduleType,
    weeklySlots,
    rangeStart: classItem.start_date ?? "",
    rangeEnd: classItem.end_date ?? "",
    sessionCount: inferSessionCount(weeklySlots, sessions),
    sessions,
  };
}

/** מעתיק לוח זמנים לחוג חדש — בלי מזהים של המועדים והמפגשים המקוריים. */
export function cloneScheduleForNewClass(
  schedule: ClassScheduleState
): ClassScheduleState {
  return {
    ...schedule,
    weeklySlots: schedule.weeklySlots.map(({ id: _id, ...slot }) => slot),
    sessions: schedule.sessions.map(({ id: _id, ...session }) => session),
  };
}
