"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
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
import { cn } from "@/utils/cn";

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
            startTime: defaultTime.startTime || "16:00",
            endTime: defaultTime.endTime || "17:00",
          },
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    onChange({ ...value, weeklySlots });
  }

  function updateSlotTime(
    dayOfWeek: number,
    field: "startTime" | "endTime",
    time: string,
  ) {
    onChange({
      ...value,
      weeklySlots: value.weeklySlots.map((slot) =>
        slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: time } : slot,
      ),
    });
  }

  function generateSessions() {
    const generated = generateWeeklySessions(
      value.weeklySlots,
      value.rangeStart,
      value.rangeEnd,
    );
    onChange({
      ...value,
      sessions: mergeGeneratedSessions(value.sessions, generated),
    });
  }

  function updateSession(index: number, patch: Partial<ClassSessionDraft>) {
    const sessions = value.sessions.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
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
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
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
                  (s) => s.dayOfWeek === dayOfWeek,
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
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink-800">
                שעות לפי יום
              </p>
              <p className="text-xs text-ink-500">
                אפשר להגדיר שעה שונה לכל יום. אחרי יצירת הרשימה אפשר גם לשנות
                שעה לכל מפגש בנפרד.
              </p>
              {value.weeklySlots.map((slot) => (
                <div
                  key={slot.dayOfWeek}
                  className="grid grid-cols-[minmax(4.5rem,auto)_1fr_1fr] items-end gap-2 rounded-xl border border-ink-100 bg-ink-50/60 p-3 sm:gap-3"
                >
                  <p className="pb-2.5 text-sm font-bold text-ink-800">
                    {DAYS_OF_WEEK[slot.dayOfWeek]}
                  </p>
                  <Field label="התחלה">
                    <ScheduleInput
                      type="time"
                      placeholder="התחלה"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlotTime(slot.dayOfWeek, "startTime", e.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label="סיום">
                    <ScheduleInput
                      type="time"
                      placeholder="סיום"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlotTime(slot.dayOfWeek, "endTime", e.target.value)
                      }
                      disabled={disabled}
                    />
                  </Field>
                </div>
              ))}
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="תאריך התחלה (טווח)">
              <ScheduleInput
                type="date"
                placeholder="בחרו תאריך התחלה"
                value={value.rangeStart}
                onChange={(e) =>
                  onChange({ ...value, rangeStart: e.target.value })
                }
                disabled={disabled}
              />
            </Field>
            <Field label="תאריך סיום (טווח)">
              <ScheduleInput
                type="date"
                placeholder="בחרו תאריך סיום"
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
            value.sessions,
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

/**
 * שדה תאריך/שעה עם תצוגה בעברית. לוחצים על כל השורה כדי לפתוח את הבורר
 * המקורי של הדפדפן — כולל שינוי שעה לכל מפגש.
 */
function ScheduleInput({
  className,
  placeholder,
  type,
  value,
  disabled,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "date" | "time";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const empty = value === "" || value == null;
  const displayValue = empty
    ? placeholder
    : type === "date"
      ? formatDate(String(value))
      : formatTime(String(value));

  function openPicker() {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // חלק מהדפדפנים חוסמים showPicker מחוץ ללחיצה ישירה על ה-input.
    }
  }

  return (
    <div
      className={cn(
        "schedule-input-shell group relative h-11 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-ink-200 bg-white transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200",
        disabled && "cursor-not-allowed bg-ink-50 opacity-60",
        !disabled && "cursor-pointer",
        className,
      )}
      onClick={openPicker}
    >
      <Input
        {...props}
        ref={inputRef}
        type={type}
        dir="ltr"
        value={value}
        disabled={disabled}
        onChange={onChange}
        onClick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
        className="schedule-native-input absolute inset-0 z-[1] !h-full !w-full min-w-0 max-w-full cursor-pointer appearance-none !border-0 !bg-transparent !px-4 !opacity-0 !shadow-none !outline-none !ring-0"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-between gap-3 px-4",
          empty
            ? "text-ink-400 group-focus-within:hidden"
            : "font-medium text-ink-800",
        )}
      >
        <span className="min-w-0 truncate" dir="rtl">
          {displayValue}
        </span>
        <Icon
          name={type === "date" ? "calendar" : "clock"}
          size={18}
          className="shrink-0 text-brand-500"
        />
      </span>
    </div>
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
      hint="לחצו על השעה של כל מפגש כדי לשנות אותה. אפשר גם לשנות תאריך, לבטל מפגש או להוסיף מפגש"
    >
      <div className="space-y-3">
        {sessions.map((session, index) => (
          <div
            key={session.id ?? `${session.sessionDate}-${session.startTime}-${index}`}
            className={`rounded-xl border p-3 ${
              session.status === "cancelled"
                ? "border-red-200 bg-red-50/50 opacity-75"
                : "border-ink-100 bg-white"
            }`}
          >
            <div className="grid gap-2 sm:grid-cols-[1.2fr_0.9fr_0.9fr]">
              <Field label="תאריך">
                <ScheduleInput
                  type="date"
                  placeholder="תאריך המפגש"
                  value={session.sessionDate}
                  onChange={(e) =>
                    onUpdate(index, { sessionDate: e.target.value })
                  }
                  disabled={disabled || session.status === "cancelled"}
                />
              </Field>
              <Field label="שעת התחלה">
                <ScheduleInput
                  type="time"
                  placeholder="התחלה"
                  value={session.startTime}
                  onChange={(e) =>
                    onUpdate(index, { startTime: e.target.value })
                  }
                  disabled={disabled || session.status === "cancelled"}
                />
              </Field>
              <Field label="שעת סיום">
                <ScheduleInput
                  type="time"
                  placeholder="סיום"
                  value={session.endTime}
                  onChange={(e) => onUpdate(index, { endTime: e.target.value })}
                  disabled={disabled || session.status === "cancelled"}
                />
              </Field>
            </div>

            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
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
                className="flex-1 sm:flex-none"
                disabled={disabled}
                onClick={() => onRemove(index)}
              >
                מחיקה
              </Button>
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
