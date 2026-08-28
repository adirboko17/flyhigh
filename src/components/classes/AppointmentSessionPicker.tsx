"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { Modal } from "@/components/ui/Modal";
import { DAY_ABBR } from "@/lib/constants";
import {
  buildMonthGrid,
  dayLabelLong,
  monthLabel,
  monthOf,
  monthRange,
  shiftMonth,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { PublicClassSession } from "@/types";

export function AppointmentPickerTrigger({
  selectedSessions,
  onOpen,
}: {
  selectedSessions: PublicClassSession[];
  onOpen: () => void;
}) {
  const selected = selectedSessions.length > 0;
  const first = selectedSessions[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors",
        selected
          ? "border-brand-200 bg-brand-50 hover:border-brand-300"
          : "border-transparent bg-brand-600 text-white shadow-glow hover:bg-brand-700"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          selected ? "bg-brand-600 text-white" : "bg-white/15 text-white"
        )}
      >
        <Icon name="calendar" size={20} />
      </span>
      <span className="min-w-0 flex-1">
        {selected && first ? (
          <>
            <span className="block text-xs font-medium text-brand-700">
              {selectedSessions.length === 1
                ? "התור שנבחר"
                : "התורים שנבחרו"}
            </span>
            <span className="mt-0.5 block truncate text-sm font-bold text-ink-900">
              {selectedSessions.length === 1
                ? `${dayLabelLong(first.session_date)} · ${formatTime(first.start_time)}`
                : `${selectedSessions.length} תורים נבחרו`}
            </span>
          </>
        ) : (
          <>
            <span className="block text-base font-bold">בחירת תורים</span>
            <span className="mt-0.5 block text-sm text-white/80">
              לחצו לבחירת תאריך ושעה
            </span>
          </>
        )}
      </span>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          selected ? "text-brand-700" : "text-white"
        )}
      >
        {selected ? "שינוי" : "בחירה"}
      </span>
    </button>
  );
}

export function AppointmentSessionPicker({
  open,
  onClose,
  sessions,
  selectedIds,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  sessions: PublicClassSession[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const datesWithSlots = useMemo(() => {
    const map = new Map<string, PublicClassSession[]>();
    for (const session of sessions) {
      const list = map.get(session.session_date) ?? [];
      list.push(session);
      map.set(session.session_date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [sessions]);

  const firstBookableDate = sessions[0]?.session_date ?? "";
  const [month, setMonth] = useState(() =>
    monthOf(firstBookableDate || todayInIsrael())
  );
  const [selectedDate, setSelectedDate] = useState(firstBookableDate);

  useEffect(() => {
    if (!open) return;
    const preferred =
      sessions.find((session) => selectedIds.includes(session.id))
        ?.session_date ?? firstBookableDate;
    if (!preferred) return;
    setSelectedDate(preferred);
    setMonth(monthOf(preferred));
    // רק בפתיחה — בחירת תור לא תחזיר את הלוח לחודש אחר.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grid = useMemo(
    () => buildMonthGrid(month, selectedDate || firstBookableDate),
    [month, selectedDate, firstBookableDate]
  );
  const daySessions = datesWithSlots.get(selectedDate) ?? [];
  const selectedSessions = sessions.filter((session) =>
    selectedIds.includes(session.id)
  );

  const { start: monthStart, end: monthEnd } = monthRange(month);
  const canPrev = sessions.some((session) => session.session_date < monthStart);
  const canNext = sessions.some((session) => session.session_date > monthEnd);

  function goToMonth(delta: number) {
    const nextMonth = shiftMonth(month, delta);
    setMonth(nextMonth);
    const range = monthRange(nextMonth);
    if (selectedDate < range.start || selectedDate > range.end) {
      const firstInMonth = sessions.find(
        (session) =>
          session.session_date >= range.start &&
          session.session_date <= range.end
      );
      if (firstInMonth) setSelectedDate(firstInMonth.session_date);
    }
  }

  function toggleSession(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((sessionId) => sessionId !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="בחירת תורים"
      description="בחרו יום בלוח ואז שעה. אפשר כמה תורים יחד."
      className="max-w-md"
    >
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-ink-500">אין תורים פנויים כרגע.</p>
        ) : (
          <>
        {selectedSessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => toggleSession(session.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 ring-1 ring-brand-200"
              >
                <span dir="ltr">
                  {formatTime(session.start_time)}
                </span>
                <span className="text-brand-500">
                  {dayLabelLong(session.session_date).replace("יום ", "")}
                </span>
                <Icon name="x" size={12} className="text-brand-500" />
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              disabled={!canPrev}
              aria-label="חודש קודם"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-white disabled:opacity-30"
            >
              <Icon name="chevron" size={18} className="rotate-180" />
            </button>
            <p className="text-sm font-bold text-ink-900">{monthLabel(month)}</p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              disabled={!canNext}
              aria-label="חודש הבא"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-white disabled:opacity-30"
            >
              <Icon name="chevron" size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_ABBR.map((label) => (
              <span
                key={label}
                className="pb-1 text-[11px] font-semibold text-ink-400"
              >
                {label}
              </span>
            ))}
            {grid.map((day) => {
              const hasSlots = datesWithSlots.has(day.date);
              const isSelected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => {
                    setSelectedDate(day.date);
                    if (!day.inMonth) setMonth(monthOf(day.date));
                  }}
                  className={cn(
                    "relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                    !day.inMonth && "opacity-40",
                    isSelected &&
                      "bg-brand-600 text-white shadow-sm",
                    !isSelected &&
                      hasSlots &&
                      "bg-white text-ink-900 ring-1 ring-brand-100 hover:bg-brand-50",
                    !hasSlots && "cursor-default text-ink-300"
                  )}
                >
                  {day.dayOfMonth}
                  {hasSlots && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-ink-900">
            {selectedDate
              ? dayLabelLong(selectedDate)
              : "בחרו יום בלוח"}
          </p>
          {daySessions.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {daySessions.map((session) => {
                const selected = selectedIds.includes(session.id);
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => toggleSession(session.id)}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-center text-sm font-bold tabular-nums transition-colors",
                      selected
                        ? "border-brand-500 bg-brand-600 text-white"
                        : "border-ink-100 bg-white text-ink-900 hover:border-brand-200 hover:bg-brand-50"
                    )}
                  >
                    <span dir="ltr">
                      {formatTime(session.start_time)}–{formatTime(session.end_time)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-500">
              אין תורים ביום הזה. בחרו יום עם נקודה כחולה.
            </p>
          )}
        </div>

        <Button type="button" className="w-full" onClick={onClose}>
          {selectedIds.length === 0
            ? "סגירה"
            : selectedIds.length === 1
              ? "בחירת התור"
              : `בחירת ${selectedIds.length} תורים`}
        </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
