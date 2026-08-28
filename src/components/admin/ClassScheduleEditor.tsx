"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { Field, Input, Select } from "@/components/ui/Input";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { CLASS_GENDER_POLICY, type ClassGenderPolicy } from "@/lib/class-audience";
import {
  duplicateWeeklySlotIndexes,
  formatWeeklySlotLabel,
  groupSessionsByWeeklySlot,
  nextWeeklySessionDate,
  nextWeeklySlotTimes,
  parseSessionCount,
  formatScheduleSummary,
  refreshWeeklySessions,
  scheduleWithSessionEdits,
  sessionSlotKey,
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
    commit({
      ...value,
      weeklySlots: value.weeklySlots.map((slot, i) =>
        i === index ? { ...slot, ...patch } : slot
      ),
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
            <Field label="מספר מפגשים">
              <Input
                type="number"
                min={0}
                max={80}
                inputMode="numeric"
                placeholder="למשל 22"
                value={value.sessionCount}
                onChange={(e) => {
                  const sessionCount = e.target.value;
                  if (!parseSessionCount(sessionCount)) {
                    onChange({
                      ...value,
                      sessionCount,
                      sessions: [],
                      rangeEnd: "",
                    });
                    return;
                  }
                  commit({ ...value, sessionCount });
                }}
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
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "date" | "time";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const empty = value === "" || value == null;
  const timeValue = empty ? "" : String(value).slice(0, 5);

  if (type === "time") {
    return (
      <Select
        value={timeValue}
        disabled={disabled}
        className={className}
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
          <p className="text-xs text-ink-500">לחצו כדי לערוך מפגש בודד</p>
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
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <SessionCard
              key={session.id ?? `${session.sessionDate}-${session.startTime}-${index}`}
              session={session}
              onUpdate={(patch) => onUpdate(index, patch)}
              onRemove={() => onRemove(index)}
              disabled={disabled}
            />
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
              <div className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-3">
                {group.items.map(({ session, index }) => (
                  <SessionCard
                    key={session.id ?? `${session.sessionDate}-${session.startTime}-${index}`}
                    session={session}
                    onUpdate={(patch) => onUpdate(index, patch)}
                    onRemove={() => onRemove(index)}
                    disabled={disabled}
                  />
                ))}
                {group.slot && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAddToSlot(group.slot!)}
                    disabled={disabled}
                  >
                    הוספת מפגש למועד
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SessionCard({
  session,
  onUpdate,
  onRemove,
  disabled,
}: {
  session: ClassSessionDraft;
  onUpdate: (patch: Partial<ClassSessionDraft>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div
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
            onChange={(e) => onUpdate({ sessionDate: e.target.value })}
            disabled={disabled || session.status === "cancelled"}
          />
        </Field>
        <Field label="שעת התחלה">
          <ScheduleInput
            type="time"
            placeholder="התחלה"
            value={session.startTime}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            disabled={disabled || session.status === "cancelled"}
          />
        </Field>
        <Field label="שעת סיום">
          <ScheduleInput
            type="time"
            placeholder="סיום"
            value={session.endTime}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
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
            onUpdate({
              status: session.status === "cancelled" ? "scheduled" : "cancelled",
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
          onClick={onRemove}
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
          onChange={(e) => onUpdate({ notes: e.target.value })}
          disabled={disabled}
        />
      )}
    </div>
  );
}
