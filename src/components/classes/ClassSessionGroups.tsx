"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons/Icon";
import { formatWeeklySlotLabel, sessionWeekday } from "@/lib/scheduling/classSchedule";
import { isElapsedClassSession } from "@/lib/finance/proratedClassPrice";
import type { PublicClassSession, PublicClassSlot } from "@/types";
import { formatDate, formatDateShort, formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";

type SessionGroup = {
  key: string;
  slot: PublicClassSlot | null;
  sessions: PublicClassSession[];
};

function matchSlot(
  session: PublicClassSession,
  slots: PublicClassSlot[]
): PublicClassSlot | null {
  if (session.weekly_slot_id) {
    return slots.find((slot) => slot.id === session.weekly_slot_id) ?? null;
  }
  const day = sessionWeekday(session.session_date);
  const start = session.start_time.slice(0, 5);
  return (
    slots.find(
      (slot) =>
        slot.day_of_week === day && slot.start_time.slice(0, 5) === start
    ) ?? null
  );
}

function groupSessions(
  sessions: PublicClassSession[],
  slots: PublicClassSlot[]
): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const slot of slots) {
    groups.set(slot.id, { key: slot.id, slot, sessions: [] });
  }

  const unmatched: SessionGroup = {
    key: "unmatched",
    slot: null,
    sessions: [],
  };

  for (const session of sessions) {
    const slot = matchSlot(session, slots);
    const group = slot ? groups.get(slot.id) : null;
    if (group) group.sessions.push(session);
    else unmatched.sessions.push(session);
  }

  const result = [...groups.values()].filter((group) => group.sessions.length > 0);
  if (unmatched.sessions.length > 0) result.push(unmatched);
  return result;
}

export function ClassSessionGroups({
  sessions,
  slots,
  today,
  showLateBadge = false,
}: {
  sessions: PublicClassSession[];
  slots: PublicClassSlot[];
  today: string;
  showLateBadge?: boolean;
}) {
  const groups = groupSessions(sessions, slots);
  const useGroups = slots.length > 0 && groups.some((group) => group.slot);

  if (!useGroups) {
    return (
      <SessionRows
        sessions={sessions}
        today={today}
        showLateBadge={showLateBadge}
      />
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {groups.map((group) => (
        <SlotSessionCard
          key={group.key}
          group={group}
          today={today}
          showLateBadge={showLateBadge}
        />
      ))}
    </div>
  );
}

function SlotSessionCard({
  group,
  today,
  showLateBadge,
}: {
  group: SessionGroup;
  today: string;
  showLateBadge: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dates = group.sessions.map((session) => session.session_date).sort();
  const title = group.slot
    ? formatWeeklySlotLabel(
        group.slot.day_of_week,
        group.slot.start_time,
        group.slot.end_time,
        group.slot.gender_policy
      )
    : "מפגשים אחרים";
  const range =
    dates.length > 0
      ? dates[0] === dates[dates.length - 1]
        ? formatDateShort(dates[0])
        : `${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}`
      : null;
  const availability =
    group.slot == null
      ? null
      : group.slot.available > 0
        ? `${group.slot.available} מקומות פנויים`
        : "מלא";

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50/40">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-ink-900">{title}</span>
          <span className="mt-0.5 block text-xs text-ink-500">
            {group.sessions.length} מפגשים
            {range ? ` · ${range}` : ""}
            {availability ? ` · ${availability}` : ""}
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

      {open && (
        <div className="border-t border-ink-100 bg-white">
          <SessionRows
            sessions={group.sessions}
            today={today}
            showLateBadge={showLateBadge}
          />
        </div>
      )}
    </div>
  );
}

function SessionRows({
  sessions,
  today,
  showLateBadge,
}: {
  sessions: PublicClassSession[];
  today: string;
  showLateBadge: boolean;
}) {
  const firstRemainingId = showLateBadge
    ? sessions.find((session) => !isElapsedClassSession(session, today))?.id
    : undefined;

  return (
    <ul className="divide-y divide-ink-100">
      {sessions.map((session, index) => {
        const elapsed = isElapsedClassSession(session, today);
        const startsHere = session.id === firstRemainingId;

        return (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <span
              className={
                elapsed
                  ? "font-semibold text-ink-400"
                  : "font-semibold text-ink-900"
              }
            >
              <span className="ms-1 text-xs font-medium text-ink-400">
                מפגש {index + 1}
              </span>{" "}
              {formatDate(session.session_date)}
            </span>
            <span className={elapsed ? "text-ink-400" : "text-ink-600"}>
              {formatTime(session.start_time)}–{formatTime(session.end_time)}
            </span>
            {elapsed && (
              <Badge tone="neutral" className="w-full justify-center sm:w-auto">
                התקיים
              </Badge>
            )}
            {startsHere && (
              <Badge tone="brand" className="w-full justify-center sm:w-auto">
                נרשמים מכאן
              </Badge>
            )}
            {session.substitute_instructor_name && !elapsed && (
              <Badge tone="warning" className="w-full justify-center sm:w-auto">
                מדריכה מחליפה: {session.substitute_instructor_name}
              </Badge>
            )}
            {session.notes && (
              <span className="w-full text-xs text-ink-400">{session.notes}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
