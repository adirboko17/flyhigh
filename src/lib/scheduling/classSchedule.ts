import { DAY_ABBR, DAYS_OF_WEEK } from "@/lib/constants";
import type { PublicClass } from "@/types";

export type ScheduleType = "weekly" | "custom";

export type WeeklySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

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

export function generateWeeklySessions(
  slots: WeeklySlot[],
  rangeStart: string,
  rangeEnd: string
): ClassSessionDraft[] {
  if (!rangeStart || !rangeEnd || slots.length === 0) return [];

  const start = parseLocalDate(rangeStart);
  const end = parseLocalDate(rangeEnd);
  if (start > end) return [];

  const sessions: ClassSessionDraft[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    const slot = slots.find((s) => s.dayOfWeek === dayOfWeek);
    if (slot) {
      sessions.push({
        sessionDate: formatLocalDate(cursor),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "scheduled",
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return sessions.sort(
    (a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) ||
      a.startTime.localeCompare(b.startTime)
  );
}

export function mergeGeneratedSessions(
  existing: ClassSessionDraft[],
  generated: ClassSessionDraft[]
): ClassSessionDraft[] {
  // מפתח לפי תאריך בלבד — כדי ששינוי שעה של מפגש לא יימחק בעדכון הרשימה.
  const existingByDate = new Map(
    existing.map((session) => [session.sessionDate, session]),
  );
  const usedDates = new Set<string>();

  const merged = generated.map((generatedSession) => {
    const prev = existingByDate.get(generatedSession.sessionDate);
    usedDates.add(generatedSession.sessionDate);
    if (!prev) return generatedSession;

    return {
      ...generatedSession,
      id: prev.id,
      status: prev.status,
      notes: prev.notes,
      sessionDate: prev.sessionDate,
      startTime: prev.startTime,
      endTime: prev.endTime,
    };
  });

  // מפגשים ידניים/מבוטלים שלא נוצרו מחדש מהטווח נשארים ברשימה.
  for (const session of existing) {
    if (usedDates.has(session.sessionDate)) continue;
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
  weeklySlots: [{ dayOfWeek: 0, startTime: "", endTime: "" }],
  rangeStart: "",
  rangeEnd: "",
  sessions: [],
});

export function weeklySlotsFromDb(
  rows: { day_of_week: number; start_time: string; end_time: string }[]
): WeeklySlot[] {
  return rows
    .map((r) => ({
      dayOfWeek: r.day_of_week,
      startTime: r.start_time.slice(0, 5),
      endTime: r.end_time.slice(0, 5),
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
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
    grade_min: string;
    grade_max: string;
    capacity: string;
    price: string;
  },
  schedule: ClassScheduleState,
  imageUrl: string | null,
  instructorName: string | null,
  previewStatus: PublicClass["status"] = "active"
): PublicClass {
  const capacity = Number(form.capacity) || 10;
  const legacy = syncLegacyClassFields(
    schedule.scheduleType,
    schedule.weeklySlots,
    schedule.sessions
  );
  const activeSessions = schedule.sessions.filter((s) => s.status !== "cancelled");
  const isGrade = form.audience_type === "grade";

  return {
    id: "preview",
    title: form.title || "שם החוג",
    description: form.description || null,
    category: form.category || null,
    level: form.level || null,
    gender_policy: form.gender_policy || "mixed",
    audience_type: form.audience_type || "age",
    age_min: isGrade ? null : form.age_min ? Number(form.age_min) : null,
    age_max: isGrade ? null : form.age_max ? Number(form.age_max) : null,
    grade_min: isGrade && form.grade_min ? Number(form.grade_min) : null,
    grade_max: isGrade && form.grade_max ? Number(form.grade_max) : null,
    capacity,
    price: Number(form.price) || 0,
    start_date: legacy.start_date,
    end_date: legacy.end_date,
    day_of_week: legacy.day_of_week,
    start_time: legacy.start_time,
    end_time: legacy.end_time,
    status: previewStatus,
    image_url: imageUrl,
    instructor_name: instructorName,
    taken_count: 0,
    available: capacity,
    schedule_type: schedule.scheduleType,
    schedule_days:
      schedule.scheduleType === "custom"
        ? null
        : formatWeeklyDays(schedule.weeklySlots.map((s) => s.dayOfWeek)) || null,
    session_count: activeSessions.length,
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
  },
  slotRows: { day_of_week: number; start_time: string; end_time: string }[],
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
            },
          ]
        : [];

  return {
    scheduleType,
    weeklySlots,
    rangeStart: classItem.start_date ?? "",
    rangeEnd: classItem.end_date ?? "",
    sessions: sessionsFromDb(sessionRows),
  };
}
