"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { DAYS_OF_WEEK } from "@/lib/constants";
import {
  generateWeeklySessions,
  mergeGeneratedSessions,
  formatScheduleSummary,
  type ClassScheduleState,
  type ClassSessionDraft,
} from "@/lib/scheduling/classSchedule";
import { formatDate, formatTime } from "@/utils/format";

interface Props {
  value: ClassScheduleState;
  onChange: (next: ClassScheduleState) => void;
  disabled?: boolean;
}

export function ClassScheduleEditor({ value, onChange, disabled }: Props) {
  const activeCount = value.sessions.filter((s) => s.status !== "cancelled").length;

  function setScheduleType(scheduleType: ClassScheduleState["scheduleType"]) {
    onChange({ ...value, scheduleType });
  }

  function toggleDay(dayOfWeek: number) {
    const exists = value.weeklySlots.some((s) => s.dayOfWeek === dayOfWeek);
    const defaultTime = value.weeklySlots[0] ?? {
      startTime: "16:00",
      endTime: "17:00",
    };

    const weeklySlots = exists
      ? value.weeklySlots.filter((s) => s.dayOfWeek !== dayOfWeek)
      : [
          ...value.weeklySlots,
          {
            dayOfWeek,
            startTime: defaultTime.startTime,
            endTime: defaultTime.endTime,
          },
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    onChange({ ...value, weeklySlots });
  }

  function setSharedTime(field: "startTime" | "endTime", time: string) {
    onChange({
      ...value,
      weeklySlots: value.weeklySlots.map((s) => ({ ...s, [field]: time })),
    });
  }

  function generateSessions() {
    const generated = generateWeeklySessions(
      value.weeklySlots,
      value.rangeStart,
      value.rangeEnd
    );
    onChange({
      ...value,
      sessions: mergeGeneratedSessions(value.sessions, generated),
    });
  }

  function updateSession(index: number, patch: Partial<ClassSessionDraft>) {
    const sessions = value.sessions.map((s, i) =>
      i === index ? { ...s, ...patch } : s
    );
    onChange({ ...value, sessions });
  }

  function removeSession(index: number) {
    onChange({
      ...value,
      sessions: value.sessions.filter((_, i) => i !== index),
    });
  }

  function addCustomSession() {
    const last = value.sessions[value.sessions.length - 1];
    onChange({
      ...value,
      sessions: [
        ...value.sessions,
        {
          sessionDate: last?.sessionDate ?? value.rangeStart ?? "",
          startTime: last?.startTime ?? value.weeklySlots[0]?.startTime ?? "16:00",
          endTime: last?.endTime ?? value.weeklySlots[0]?.endTime ?? "17:00",
          status: "scheduled",
        },
      ],
    });
  }

  return (
    <div className="space-y-5">
      <Field label="סוג לוח זמנים">
        <div className="grid gap-3 sm:grid-cols-2">
          <ScheduleTypeOption
            active={value.scheduleType === "weekly"}
            title="שבועי חוזר"
            description="פעם בשבוע או יותר · עם אפשרות לערוך מפגשים בודדים"
            onClick={() => setScheduleType("weekly")}
            disabled={disabled}
          />
          <ScheduleTypeOption
            active={value.scheduleType === "custom"}
            title="תאריכים מותאמים"
            description="הוספת כל מפגש ידנית — לחגים, דחיות ושינויים"
            onClick={() => setScheduleType("custom")}
            disabled={disabled}
          />
        </div>
      </Field>

      {value.scheduleType === "weekly" && (
        <>
          <Field label="ימים בשבוע" hint="ניתן לבחור יום אחד או יותר">
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((label, dayOfWeek) => {
                const selected = value.weeklySlots.some(
                  (s) => s.dayOfWeek === dayOfWeek
                );
                return (
                  <button
                    key={dayOfWeek}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleDay(dayOfWeek)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          {value.weeklySlots.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="שעת התחלה (לכל הימים)">
                <Input
                  type="time"
                  value={value.weeklySlots[0]?.startTime ?? ""}
                  onChange={(e) => setSharedTime("startTime", e.target.value)}
                  disabled={disabled}
                />
              </Field>
              <Field label="שעת סיום (לכל הימים)">
                <Input
                  type="time"
                  value={value.weeklySlots[0]?.endTime ?? ""}
                  onChange={(e) => setSharedTime("endTime", e.target.value)}
                  disabled={disabled}
                />
              </Field>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="תאריך התחלה (טווח)">
              <Input
                type="date"
                value={value.rangeStart}
                onChange={(e) =>
                  onChange({ ...value, rangeStart: e.target.value })
                }
                disabled={disabled}
              />
            </Field>
            <Field label="תאריך סיום (טווח)">
              <Input
                type="date"
                value={value.rangeEnd}
                onChange={(e) =>
                  onChange({ ...value, rangeEnd: e.target.value })
                }
                disabled={disabled}
              />
            </Field>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              disabled ||
              value.weeklySlots.length === 0 ||
              !value.rangeStart ||
              !value.rangeEnd
            }
            onClick={generateSessions}
          >
            יצירת / עדכון רשימת מפגשים
          </Button>
        </>
      )}

      <SessionList
        sessions={value.sessions}
        scheduleType={value.scheduleType}
        onUpdate={updateSession}
        onRemove={removeSession}
        onAdd={addCustomSession}
        disabled={disabled}
      />

      {activeCount > 0 && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {formatScheduleSummary(
            value.scheduleType,
            value.weeklySlots,
            value.sessions
          )}
        </p>
      )}
    </div>
  );
}

function ScheduleTypeOption({
  active,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-right transition ${
        active
          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
          : "border-ink-200 bg-white hover:border-brand-300"
      } disabled:opacity-50`}
    >
      <p className="font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs text-ink-500">{description}</p>
    </button>
  );
}

function SessionList({
  sessions,
  scheduleType,
  onUpdate,
  onRemove,
  onAdd,
  disabled,
}: {
  sessions: ClassSessionDraft[];
  scheduleType: ClassScheduleState["scheduleType"];
  onUpdate: (index: number, patch: Partial<ClassSessionDraft>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  if (sessions.length === 0 && scheduleType === "custom") {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
        <p className="text-sm text-ink-600">טרם נוספו מפגשים</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onAdd}
          disabled={disabled}
        >
          הוספת מפגש
        </Button>
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <Field
      label="מפגשים"
      hint="ניתן לבטל מפגש (חג), לשנות תאריך/שעה, או להוסיף מפגש מחליף"
    >
      <div className="space-y-2">
        {sessions.map((session, index) => (
          <div
            key={session.id ?? `${session.sessionDate}-${session.startTime}-${index}`}
            className={`rounded-xl border p-3 ${
              session.status === "cancelled"
                ? "border-red-200 bg-red-50/50 opacity-75"
                : "border-ink-100 bg-white"
            }`}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <Input
                type="date"
                value={session.sessionDate}
                onChange={(e) =>
                  onUpdate(index, { sessionDate: e.target.value })
                }
                disabled={disabled || session.status === "cancelled"}
              />
              <Input
                type="time"
                value={session.startTime}
                onChange={(e) => onUpdate(index, { startTime: e.target.value })}
                disabled={disabled || session.status === "cancelled"}
              />
              <Input
                type="time"
                value={session.endTime}
                onChange={(e) => onUpdate(index, { endTime: e.target.value })}
                disabled={disabled || session.status === "cancelled"}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    onUpdate(index, {
                      status:
                        session.status === "cancelled" ? "scheduled" : "cancelled",
                      notes:
                        session.status === "cancelled"
                          ? undefined
                          : session.notes ?? "בוטל",
                    })
                  }
                >
                  {session.status === "cancelled" ? "שחזור" : "ביטול"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                >
                  מחיקה
                </Button>
              </div>
            </div>
            {session.status === "cancelled" && (
              <p className="mt-2 text-xs font-medium text-red-600">
                מפגש מבוטל · {formatDate(session.sessionDate)}{" "}
                {formatTime(session.startTime)}
              </p>
            )}
            {session.status !== "cancelled" && (
              <Input
                className="mt-2"
                placeholder="הערה (למשל: דחייה בגלל חג)"
                value={session.notes ?? ""}
                onChange={(e) => onUpdate(index, { notes: e.target.value })}
                disabled={disabled}
              />
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
        >
          הוספת מפגש
        </Button>
      </div>
    </Field>
  );
}
