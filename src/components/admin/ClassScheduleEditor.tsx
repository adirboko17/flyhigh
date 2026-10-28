"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { Field, Input, Select } from "@/components/ui/Input";
import { DAY_ABBR, DAYS_OF_WEEK } from "@/lib/constants";
import { CLASS_GENDER_POLICY, type ClassGenderPolicy } from "@/lib/class-audience";
import {
  duplicateWeeklySlotIndexes,
  formatWeeklySlotLabel,
  groupSessionsByWeeklySlot,
  moveSessionsWithWeeklySlot,
  nextWeeklySessionDate,
  nextWeeklySlotTimes,
  parseSessionCount,
  formatScheduleSummary,
  refreshWeeklySessions,
  resizeWeeklySessions,
  scheduleWithSessionEdits,
  sessionSlotKey,
  sessionWeekday,
  weeklySlotKey,
  type ClassScheduleState,
  type ClassSessionDraft,
  type WeeklySlot,
} from "@/lib/scheduling/classSchedule";
import { formatDate, formatDateShort, formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import { InstructorSelect } from "@/components/admin/InstructorSelect";

interface Props {
  value: ClassScheduleState;
  onChange: (next: ClassScheduleState) => void;
  disabled?: boolean;
  pickOneSlot?: boolean;
  onPickOneSlotChange?: (pickOneSlot: boolean) => void;
  instructors?: ClassInstructorOption[];
}

export function ClassScheduleEditor({
  value,
  onChange,
  disabled,
  pickOneSlot = true,
  onPickOneSlotChange,
  instructors = [],
}: Props) {
  const [moreOpen, setMoreOpen] = useState(() =>
    value.scheduleType === "custom" ||
    value.weeklySlots.some((slot) => Boolean(slot.note?.trim())) ||
    (Boolean(value.rangeEnd) && !parseSessionCount(value.sessionCount))
  );
  const activeCount = value.sessions.filter((s) => s.status !== "cancelled").length;
  const weekly = value.scheduleType === "weekly";
  const showNotes = moreOpen || value.weeklySlots.some((slot) => Boolean(slot.note?.trim()));
  const duplicateSlotIndexes = duplicateWeeklySlotIndexes(value.weeklySlots);
  const valueRef = useRef(value);
  valueRef.current = value;
  const typedCount = useRef(value.sessionCount);
  const sessionCountTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (sessionCountTimer.current) window.clearTimeout(sessionCountTimer.current);
    };
  }, []);

  function commit(next: ClassScheduleState) {
    onChange(next.scheduleType === "weekly" ? refreshWeeklySessions(next) : next);
  }

  function setScheduleType(scheduleType: ClassScheduleState["scheduleType"]) {
    commit({ ...value, scheduleType });
    if (scheduleType === "custom") setMoreOpen(true);
  }

  function addWeeklySlot() {
    const last = value.weeklySlots[value.weeklySlots.length - 1];
    const times = nextWeeklySlotTimes(last);
    commit({
      ...value,
      weeklySlots: [
        ...value.weeklySlots,
        {
          dayOfWeek: last?.dayOfWeek ?? 1,
          startTime: times.startTime,
          endTime: times.endTime,
          genderPolicy: last?.genderPolicy ?? "mixed",
          instructorId: last?.instructorId,
        },
      ],
    });
  }

  function updateWeeklySlot(
    index: number,
    patch: Partial<(typeof value.weeklySlots)[number]>
  ) {
    const previous = value.weeklySlots[index];
    if (!previous) return;
    const nextSlot = { ...previous, ...patch };
    const nextKey = weeklySlotKey(nextSlot);
    // מועד עם אותו יום ואותה שעת התחלה לא מזיז סדרה, כדי לא לערבב אותה עם המועד השני.
    const blocksMove = value.weeklySlots.some(
      (slot, slotIndex) =>
        slotIndex !== index &&
        Boolean(slot.startTime.trim()) &&
        (weeklySlotKey(slot) === nextKey || weeklySlotKey(slot) === weeklySlotKey(previous))
    );
    commit({
      ...value,
      weeklySlots: value.weeklySlots.map((slot, i) =>
        i === index ? nextSlot : slot
      ),
      sessions: blocksMove
        ? value.sessions
        : moveSessionsWithWeeklySlot(value.sessions, previous, nextSlot, value),
    });
  }

  function removeWeeklySlot(index: number) {
    commit({
      ...value,
      weeklySlots: value.weeklySlots.filter((_, i) => i !== index),
    });
  }

  function applySessions(sessions: ClassSessionDraft[]) {
    onChange(scheduleWithSessionEdits(value, sessions));
  }

  function commitSessionCount(current: ClassScheduleState, sessionCount: string) {
    if (current.scheduleType !== "weekly") return;
    if (!parseSessionCount(sessionCount)) {
      if (current.sessions.length === 0 && current.sessionCount === sessionCount) return;
      onChange({
        ...current,
        sessionCount,
        sessions: [],
        rangeEnd: "",
      });
      return;
    }
    const next = resizeWeeklySessions(current, sessionCount);
    if (next === current) return;
    onChange(next);
  }

  function changeSessionCount(sessionCount: string) {
    typedCount.current = sessionCount;
    if (sessionCountTimer.current) {
      window.clearTimeout(sessionCountTimer.current);
      sessionCountTimer.current = null;
    }
    const previous = parseSessionCount(value.sessionCount);
    const next = parseSessionCount(sessionCount);
    const stepped =
      previous != null && next != null && Math.abs(next - previous) === 1;
    if (stepped) {
      onChange(resizeWeeklySessions(value, sessionCount));
      return;
    }
    onChange({ ...value, sessionCount });
    sessionCountTimer.current = window.setTimeout(() => {
      sessionCountTimer.current = null;
      commitSessionCount(valueRef.current, sessionCount);
    }, 400);
  }

  function blurSessionCount() {
    if (sessionCountTimer.current) {
      window.clearTimeout(sessionCountTimer.current);
      sessionCountTimer.current = null;
    }
    commitSessionCount(valueRef.current, typedCount.current);
  }

  function updateSession(index: number, patch: Partial<ClassSessionDraft>) {
    onChange({
      ...value,
      sessions: value.sessions.map((s, i) =>
        i === index ? { ...s, ...patch } : s
      ),
    });
  }

  function removeSession(index: number) {
    applySessions(value.sessions.filter((_, i) => i !== index));
  }

  function removeSessions(indexes: number[]) {
    const remove = new Set(indexes);
    applySessions(value.sessions.filter((_, i) => !remove.has(i)));
  }

  function removeAllSessions() {
    if (value.sessions.length === 0) return;
    if (
      !window.confirm(
        "למחוק את כל המפגשים? מספר המפגשים למעלה יתאפס."
      )
    ) {
      return;
    }
    applySessions([]);
  }

  function addCustomSession() {
    const last = value.sessions[value.sessions.length - 1];
    applySessions([
      ...value.sessions,
      {
        sessionDate: last?.sessionDate ?? value.rangeStart ?? "",
        startTime: last?.startTime ?? value.weeklySlots[0]?.startTime ?? "16:00",
        endTime: last?.endTime ?? value.weeklySlots[0]?.endTime ?? "17:00",
        status: "scheduled",
      },
    ]);
  }

  function addSessionToSlot(slot: WeeklySlot) {
    const key = weeklySlotKey(slot);
    const lastDate = value.sessions
      .filter((session) => session.sessionDate && sessionSlotKey(session) === key)
      .map((session) => session.sessionDate)
      .sort()
      .at(-1);

    applySessions([
      ...value.sessions,
      {
        sessionDate: nextWeeklySessionDate(slot, lastDate, value.rangeStart),
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "scheduled",
      },
    ]);
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-hidden">
      {weekly ? (
        <>
          <div className="space-y-3">
            {value.weeklySlots.map((slot, index) => (
              <div
                key={slot.id ?? `new-${index}`}
                className={cn(
                  "space-y-2 rounded-2xl border bg-white p-3",
                  duplicateSlotIndexes.has(index)
                    ? "border-red-300"
                    : "border-ink-100"
                )}
              >
                <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(6.5rem,1fr)_1fr_1fr_minmax(6.5rem,1fr)_auto] sm:gap-3">
                  <Field label="יום">
                    <Select
                      value={String(slot.dayOfWeek)}
                      onChange={(e) =>
                        updateWeeklySlot(index, {
                          dayOfWeek: Number(e.target.value),
                        })
                      }
                      disabled={disabled}
                    >
                      {DAYS_OF_WEEK.map((label, dayOfWeek) => (
                        <option key={dayOfWeek} value={dayOfWeek}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="התחלה">
                    <ScheduleInput
                      type="time"
                      placeholder="התחלה"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateWeeklySlot(index, { startTime: e.target.value })
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
                        updateWeeklySlot(index, { endTime: e.target.value })
                      }
                      disabled={disabled}
                    />
                  </Field>
                  <Field label="מגדר">
                    <Select
                      value={slot.genderPolicy}
                      onChange={(e) =>
                        updateWeeklySlot(index, {
                          genderPolicy: e.target.value as ClassGenderPolicy,
                        })
                      }
                      disabled={disabled}
                    >
                      {(Object.keys(CLASS_GENDER_POLICY) as ClassGenderPolicy[]).map(
                        (policy) => (
                          <option key={policy} value={policy}>
                            {CLASS_GENDER_POLICY[policy]}
                          </option>
                        )
                      )}
                    </Select>
                  </Field>
                  {value.weeklySlots.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mb-0.5 text-ink-500"
                      disabled={disabled}
                      onClick={() => removeWeeklySlot(index)}
                    >
                      הסרה
                    </Button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </div>
                {instructors.length > 0 && (
                  <Field
                    label={
                      value.weeklySlots.length > 1
                        ? "מדריך או מדריכה למועד הזה"
                        : "מדריך או מדריכה"
                    }
                  >
                    <InstructorSelect
                      value={slot.instructorId ?? ""}
                      onChange={(instructorId) =>
                        updateWeeklySlot(index, {
                          instructorId: instructorId || undefined,
                        })
                      }
                      instructors={instructors}
                      disabled={disabled}
                    />
                  </Field>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field
                    label="מחיר למועד הזה"
                    hint="ריק = מחיר החוג. רק אם המועד הזה במחיר אחר."
                  >
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={slot.price == null ? "" : String(slot.price)}
                      onChange={(e) =>
                        updateWeeklySlot(index, {
                          price: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="למשל: 800"
                      disabled={disabled}
                    />
                  </Field>
                  <Field
                    label="התחלה למועד הזה"
                    hint="ריק = תאריך ההתחלה של החוג."
                  >
                    <ScheduleInput
                      type="date"
                      placeholder="תאריך התחלה"
                      value={slot.startsOn ?? ""}
                      onChange={(e) =>
                        updateWeeklySlot(index, {
                          startsOn: e.target.value || undefined,
                        })
                      }
                      disabled={disabled}
                    />
                  </Field>
                </div>
                {showNotes && (
                  <Field label="הערה להורים">
                    <Input
                      value={slot.note ?? ""}
                      onChange={(e) =>
                        updateWeeklySlot(index, { note: e.target.value })
                      }
                      placeholder="למשל: מותנה בכמות נרשמות"
                      disabled={disabled}
                    />
                  </Field>
                )}
                {duplicateSlotIndexes.has(index) && (
                  <p className="text-sm font-medium text-red-600">
                    יש מועד נוסף באותו יום ובאותה שעת התחלה. שנו את השעה או מחקו
                    כפיל.
                  </p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={addWeeklySlot}
            >
              + מועד נוסף
            </Button>
          </div>

          {value.weeklySlots.length > 1 && onPickOneSlotChange && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-800">
                איך נרשמים לכמה מועדים?
              </p>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-50 p-1">
                <PickModeButton
                  active={pickOneSlot}
                  disabled={disabled}
                  onClick={() => onPickOneSlotChange(true)}
                  label="בוחרים מועד אחד"
                />
                <PickModeButton
                  active={!pickOneSlot}
                  disabled={disabled}
                  onClick={() => onPickOneSlotChange(false)}
                  label="מגיעים לכל המועדים"
                />
              </div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="תאריך התחלה">
              <ScheduleInput
                type="date"
                placeholder="מתי מתחילים"
                value={value.rangeStart}
                onChange={(e) =>
                  commit({ ...value, rangeStart: e.target.value })
                }
                disabled={disabled}
              />
            </Field>
            <Field
              label="מספר מפגשים"
              hint="פחות מפגשים מוחק מהסוף, יותר מוסיף בסוף."
            >
              <Input
                type="number"
                min={0}
                max={80}
                inputMode="numeric"
                placeholder="למשל 22"
                value={value.sessionCount}
                onChange={(e) => changeSessionCount(e.target.value)}
                onBlur={blurSessionCount}
                disabled={disabled}
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ink-50 px-4 py-3">
          <p className="text-sm text-ink-600">כל מפגש נוסף ידנית</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setScheduleType("weekly")}
          >
            חזרה ללוח שבועי
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          {moreOpen ? "פחות אפשרויות" : "עוד אפשרויות"}
          <Icon
            name="chevron"
            size={16}
            className={cn(
              "transition-transform",
              moreOpen ? "-rotate-90" : "rotate-90"
            )}
          />
        </button>

        {moreOpen && (
          <div className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
            {weekly && (
              <Field label="תאריך סיום" hint="אופציונלי, אם אין מספר מפגשים">
                <ScheduleInput
                  type="date"
                  placeholder="בחרו תאריך"
                  value={value.rangeEnd}
                  onChange={(e) =>
                    commit({ ...value, rangeEnd: e.target.value })
                  }
                  disabled={disabled}
                />
              </Field>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-ink-800">סוג לוח</p>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-ink-50 p-1">
                <PickModeButton
                  active={weekly}
                  disabled={disabled}
                  onClick={() => setScheduleType("weekly")}
                  label="שבועי חוזר"
                />
                <PickModeButton
                  active={!weekly}
                  disabled={disabled}
                  onClick={() => setScheduleType("custom")}
                  label="תאריכים מותאמים"
                />
              </div>
              <p className="text-xs text-ink-500">
                תאריכים מותאמים מתאימים לחגים, חוג קצר או שינויים ידניים.
              </p>
            </div>
          </div>
        )}
      </div>

      <SessionList
        sessions={value.sessions}
        weeklySlots={value.weeklySlots}
        scheduleType={value.scheduleType}
        onUpdate={updateSession}
        onRemove={removeSession}
        onRemoveMany={removeSessions}
        onRemoveAll={removeAllSessions}
        onAdd={addCustomSession}
        onAddToSlot={addSessionToSlot}
        disabled={disabled}
      />

      {activeCount > 0 && (
        <p className="text-sm text-ink-500">
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

function PickModeButton({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-white text-brand-700 shadow-soft"
          : "text-ink-500 hover:text-ink-800",
        "disabled:opacity-50"
      )}
    >
      {label}
    </button>
  );
}

const TIME_MINUTES = [0, 15, 30, 45] as const;

function timeSelectOptions(current: string) {
  const options: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of TIME_MINUTES) {
      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }
  if (current && !options.includes(current)) {
    options.push(current);
    options.sort();
  }
  return options;
}

/**
 * תאריך נשאר בבורר העברי. שעה היא רשימה בקפיצות של רבע שעה —
 * בלי הגלילה הארוכה של דקה-דקה בדפדפן.
 */
function ScheduleInput({
  className,
  placeholder,
  type,
  value,
  disabled,
  dense = false,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "date" | "time";
  dense?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const empty = value === "" || value == null;
  const timeValue = empty ? "" : String(value).slice(0, 5);

  if (type === "time") {
    return (
      <Select
        value={timeValue}
        disabled={disabled}
        className={cn(dense && "!h-9 !px-2", className)}
        aria-label={placeholder}
        onChange={(event) =>
          onChange?.({
            target: { value: event.target.value },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        <option value="">{placeholder || "שעה"}</option>
        {timeSelectOptions(timeValue).map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </Select>
    );
  }

  const displayValue = empty ? placeholder : formatDate(String(value));

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
        "schedule-input-shell group relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-ink-200 bg-white transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200",
        dense ? "h-9" : "h-11",
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
          "pointer-events-none absolute inset-0 z-0 flex items-center justify-between gap-2",
          dense ? "px-2.5" : "px-4",
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
  weeklySlots,
  scheduleType,
  onUpdate,
  onRemove,
  onRemoveMany,
  onRemoveAll,
  onAdd,
  onAddToSlot,
  disabled,
}: {
  sessions: ClassSessionDraft[];
  weeklySlots: WeeklySlot[];
  scheduleType: ClassScheduleState["scheduleType"];
  onUpdate: (index: number, patch: Partial<ClassSessionDraft>) => void;
  onRemove: (index: number) => void;
  onRemoveMany: (indexes: number[]) => void;
  onRemoveAll: () => void;
  onAdd: () => void;
  onAddToSlot: (slot: WeeklySlot) => void;
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

  const grouped =
    scheduleType === "weekly" && weeklySlots.length > 0
      ? groupSessionsByWeeklySlot(weeklySlots, sessions)
      : null;

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-800">מפגשים</p>
          <p className="text-xs text-ink-500">פתחו מועד ועדכנו תאריך או שעה בכל שורה</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={disabled}
          onClick={onRemoveAll}
        >
          מחיקת כל המפגשים
        </Button>
      </div>
      {grouped ? (
        <GroupedSessionList
          groups={grouped}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onRemoveMany={onRemoveMany}
          onAddToSlot={onAddToSlot}
          disabled={disabled}
        />
      ) : (
        <SessionTable
          items={sessions.map((session, index) => ({ session, index }))}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onAdd={onAdd}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function GroupedSessionList({
  groups,
  onUpdate,
  onRemove,
  onRemoveMany,
  onAddToSlot,
  disabled,
}: {
  groups: ReturnType<typeof groupSessionsByWeeklySlot>;
  onUpdate: (index: number, patch: Partial<ClassSessionDraft>) => void;
  onRemove: (index: number) => void;
  onRemoveMany: (indexes: number[]) => void;
  onAddToSlot: (slot: WeeklySlot) => void;
  disabled?: boolean;
}) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  function toggle(key: string) {
    setOpenKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const open = openKeys.includes(group.key);
        const active = group.items.filter(
          (item) => item.session.status !== "cancelled"
        );
        const cancelled = group.items.length - active.length;
        const dates = active
          .map((item) => item.session.sessionDate)
          .filter(Boolean)
          .sort();
        const title = group.slot
          ? formatWeeklySlotLabel(
              group.slot.dayOfWeek,
              group.slot.startTime,
              group.slot.endTime,
              group.slot.genderPolicy
            )
          : "מפגשים אחרים";
        const range =
          dates.length > 0
            ? dates[0] === dates[dates.length - 1]
              ? formatDateShort(dates[0])
              : `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
            : null;

        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-2xl border border-ink-200 bg-white"
          >
            <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-1.5 text-right"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink-900">{title}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {active.length} מפגשים
                    {cancelled > 0 ? ` · ${cancelled} מבוטלים` : ""}
                    {range ? ` · ${range}` : ""}
                  </span>
                </span>
                <Icon
                  name="chevron"
                  size={18}
                  className={cn(
                    "shrink-0 text-ink-400 transition-transform",
                    open && "-rotate-90"
                  )}
                />
              </button>
              {groups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={disabled}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `למחוק את כל המפגשים במועד "${title}"? מספר המפגשים למעלה יתעדכן.`
                      )
                    ) {
                      return;
                    }
                    onRemoveMany(group.items.map((item) => item.index));
                  }}
                >
                  מחיקת הכל
                </Button>
              )}
            </div>

            {open && (
              <div className="border-t border-ink-100 bg-ink-50/40">
                <SessionTable
                  items={group.items}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAdd={group.slot ? () => onAddToSlot(group.slot!) : undefined}
                  addLabel="הוספת מפגש למועד"
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const sessionColumns =
  "sm:grid-cols-[2rem_minmax(0,1fr)_5.5rem_5.5rem_9.5rem]";

function SessionTable({
  items,
  onUpdate,
  onRemove,
  onAdd,
  addLabel = "הוספת מפגש",
  disabled,
}: {
  items: { session: ClassSessionDraft; index: number }[];
  onUpdate: (index: number, patch: Partial<ClassSessionDraft>) => void;
  onRemove: (index: number) => void;
  onAdd?: () => void;
  addLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="max-h-[28rem] overflow-y-auto">
        <div
          className={cn(
            "sticky top-0 z-[1] hidden gap-2 border-b border-ink-100 bg-ink-50 px-3 py-2 text-[11px] font-semibold text-ink-500 sm:grid",
            sessionColumns
          )}
        >
          <span />
          <span>תאריך</span>
          <span>התחלה</span>
          <span>סיום</span>
          <span>פעולות</span>
        </div>
        <ul className="divide-y divide-ink-100">
          {items.map(({ session, index }, position) => (
            <SessionRow
              key={session.id ?? `${session.sessionDate}-${session.startTime}-${index}`}
              position={position + 1}
              session={session}
              onUpdate={(patch) => onUpdate(index, patch)}
              onRemove={() => onRemove(index)}
              disabled={disabled}
            />
          ))}
        </ul>
      </div>
      {onAdd && (
        <div className="border-t border-ink-100 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            disabled={disabled}
          >
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function SessionRow({
  position,
  session,
  onUpdate,
  onRemove,
  disabled,
}: {
  position: number;
  session: ClassSessionDraft;
  onUpdate: (patch: Partial<ClassSessionDraft>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const cancelled = session.status === "cancelled";
  const [noteOpen, setNoteOpen] = useState(() => Boolean(session.notes?.trim()));
  const locked = disabled || cancelled;
  const dayAbbr =
    session.sessionDate && /^\d{4}-\d{2}-\d{2}$/.test(session.sessionDate)
      ? DAY_ABBR[sessionWeekday(session.sessionDate)] ?? ""
      : "";

  return (
    <li className={cn("px-3 py-2", cancelled ? "bg-red-50/80" : "bg-white")}>
      <div
        className={cn(
          "grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2",
          sessionColumns
        )}
      >
        <span className="order-1 row-span-2 self-center text-center leading-none sm:row-span-1">
          <span
            className={cn(
              "block text-xs font-bold tabular-nums",
              cancelled ? "text-red-400 line-through" : "text-ink-400"
            )}
          >
            {position}
          </span>
          {dayAbbr && (
            <span className="mt-0.5 block text-[10px] font-semibold text-ink-500">
              {dayAbbr}
            </span>
          )}
        </span>
        <div className="order-2 col-span-2 min-w-0 sm:col-span-1">
          <ScheduleInput
            dense
            type="date"
            placeholder="תאריך"
            value={session.sessionDate}
            onChange={(e) => onUpdate({ sessionDate: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="order-4 min-w-0 sm:order-3">
          <ScheduleInput
            dense
            type="time"
            placeholder="התחלה"
            value={session.startTime}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="order-5 min-w-0 sm:order-4">
          <ScheduleInput
            dense
            type="time"
            placeholder="סיום"
            value={session.endTime}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
            disabled={locked}
          />
        </div>
        <div className="order-3 flex items-center justify-end gap-0.5 max-sm:col-start-4 max-sm:row-start-1 sm:order-5">
          {!cancelled && (
            <button
              type="button"
              className={cn(
                "rounded-full px-2 py-1 text-xs font-semibold",
                session.notes?.trim()
                  ? "text-brand-700 hover:bg-brand-50"
                  : "text-ink-500 hover:bg-ink-100"
              )}
              disabled={disabled}
              onClick={() => setNoteOpen((open) => !open)}
            >
              הערה
            </button>
          )}
          <button
            type="button"
            className={cn(
              "rounded-full px-2 py-1 text-xs font-semibold",
              cancelled
                ? "text-brand-700 hover:bg-brand-50"
                : "text-ink-500 hover:bg-ink-100"
            )}
            disabled={disabled}
            onClick={() =>
              onUpdate({
                status: cancelled ? "scheduled" : "cancelled",
                notes: cancelled ? undefined : session.notes ?? "בוטל",
              })
            }
          >
            {cancelled ? "שחזור" : "ביטול"}
          </button>
          <button
            type="button"
            aria-label="מחיקה"
            title="מחיקה"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            disabled={disabled}
            onClick={onRemove}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
      {cancelled && (
        <p className="mt-1.5 text-xs font-medium text-red-600">
          מפגש מבוטל · {formatDate(session.sessionDate)} {formatTime(session.startTime)}
        </p>
      )}
      {!cancelled && noteOpen && (
        <Input
          className="mt-2 !h-9"
          placeholder="הערה (למשל: דחייה בגלל חג)"
          value={session.notes ?? ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          disabled={disabled}
        />
      )}
    </li>
  );
}
