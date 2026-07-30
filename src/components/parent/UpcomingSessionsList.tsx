"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CLASS_SESSION_STATUS } from "@/lib/constants";
import { dayLabelLong } from "@/lib/scheduling/monthGrid";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatTime, initials } from "@/utils/format";

export type AgendaSession = {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: Enums<"class_session_status">;
  title: string;
  attendees: string[];
  notes: string | null;
  regularInstructorName: string | null;
  substituteInstructorName: string | null;
  instructorName: string | null;
  isSubstitute: boolean;
};

export function UpcomingSessionsList({
  sessions,
  today,
}: {
  sessions: AgendaSession[];
  today: string;
}) {
  const [selected, setSelected] = useState<AgendaSession | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function openSession(
    session: AgendaSession,
    trigger: HTMLButtonElement
  ) {
    triggerRef.current = trigger;
    setSelected(session);
  }

  function closeSession() {
    setSelected(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <ul className="space-y-2 sm:space-y-3">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            today={today}
            onOpen={openSession}
          />
        ))}
      </ul>

      <SessionDetailsModal
        session={selected}
        today={today}
        onClose={closeSession}
      />
    </>
  );
}

function SessionRow({
  session,
  today,
  onOpen,
}: {
  session: AgendaSession;
  today: string;
  onOpen: (session: AgendaSession, trigger: HTMLButtonElement) => void;
}) {
  const cancelled = session.status === "cancelled";
  const isToday = session.date === today;
  const chip = dateChip(session.date);
  const time = `${formatTime(session.startTime)}–${formatTime(session.endTime)}`;

  return (
    <li>
      <button
        type="button"
        onClick={(event) => onOpen(session, event.currentTarget)}
        aria-haspopup="dialog"
        aria-label={`פרטי מפגש ${session.title}, ${dayLabelLong(session.date)}, ${time}`}
        className={cn(
          "flex w-full min-w-0 items-center gap-2.5 rounded-xl border p-2.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:translate-y-0 sm:gap-4 sm:rounded-2xl sm:p-3.5",
          cancelled
            ? "border-ink-100 bg-ink-50/60"
            : isToday
              ? "border-brand-200 bg-brand-50/60 hover:border-brand-300"
              : "border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-50/40"
        )}
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg sm:h-14 sm:w-14 sm:rounded-xl",
            isToday && !cancelled
              ? "bg-brand-gradient text-white"
              : "bg-white text-ink-700 ring-1 ring-inset ring-ink-100"
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {chip.month}
          </span>
          <span className="font-display text-base font-extrabold leading-none sm:text-xl">
            {chip.day}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate font-display text-sm font-bold text-ink-900 sm:text-base",
                cancelled && "text-ink-400 line-through decoration-ink-300"
              )}
            >
              {session.title}
            </span>
            {isToday && !cancelled && (
              <Badge tone="brand" className="shrink-0">
                היום
              </Badge>
            )}
          </span>

          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500 sm:mt-1 sm:gap-x-3 sm:gap-y-1 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" size={15} className="shrink-0 text-ink-400" />
              <span dir="ltr" className="tabular-nums">
                {time}
              </span>
            </span>
            {session.attendees.length > 0 && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon name="child" size={15} className="shrink-0 text-ink-400" />
                <span className="truncate">{session.attendees.join(", ")}</span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1.5 sm:hidden">
              <Icon name="teacher" size={15} className="shrink-0 text-ink-400" />
              <span className="truncate">
                {session.instructorName ?? "ללא מדריך/ה"}
                {session.isSubstitute && " (מחליף/ה)"}
              </span>
            </span>
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-1.5 self-start text-end sm:flex">
          <Icon
            name="teacher"
            size={15}
            className={session.instructorName ? "text-ink-400" : "text-ink-300"}
          />
          <span
            className={cn(
              "max-w-[8rem] truncate text-sm font-medium",
              session.instructorName ? "text-ink-700" : "text-ink-400"
            )}
          >
            {session.instructorName ?? "ללא מדריך/ה"}
          </span>
          {session.isSubstitute && <Badge tone="warning">מחליף/ה</Badge>}
        </span>

        <Icon
          name="arrow"
          size={17}
          className="shrink-0 rotate-180 text-ink-300"
        />
      </button>
    </li>
  );
}

function SessionDetailsModal({
  session,
  today,
  onClose,
}: {
  session: AgendaSession | null;
  today: string;
  onClose: () => void;
}) {
  if (!session) return null;

  const isToday = session.date === today;
  const status = CLASS_SESSION_STATUS[session.status];

  return (
    <Modal
      open
      onClose={onClose}
      title={session.title}
      description={dayLabelLong(session.date)}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-glow sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon name="calendar" size={24} />
              </span>
              <div>
                <p className="text-xs font-medium text-white/75">מועד המפגש</p>
                <p className="font-display text-lg font-extrabold">
                  {dayLabelLong(session.date)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge tone={status.tone}>{status.label}</Badge>
              {isToday && <Badge tone="brand">היום</Badge>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 text-base font-semibold">
            <Icon name="clock" size={18} className="text-white/80" />
            <span dir="ltr" className="tabular-nums">
              {formatTime(session.startTime)}–{formatTime(session.endTime)}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Icon name="teacher" size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-ink-900">מדריך/ת המפגש</h3>
              <p className="mt-0.5 text-sm font-medium text-ink-700">
                {session.substituteInstructorName ??
                  session.regularInstructorName ??
                  "טרם שובץ/ה מדריך/ה"}
              </p>
              {session.substituteInstructorName && (
                <p className="mt-1 text-xs text-ink-500">
                  מדריך/ה מחליף/ה
                  {session.regularInstructorName
                    ? ` במקום ${session.regularInstructorName}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="font-display font-bold text-ink-900">
              המשתתפים מהחשבון
            </h3>
            <Badge tone="success">{session.attendees.length}</Badge>
          </div>
          {session.attendees.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {session.attendees.map((attendee) => (
                <li
                  key={attendee}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aqua-500 font-display text-xs font-bold text-white">
                    {initials(attendee)}
                  </span>
                  <span className="min-w-0 break-words text-sm font-semibold text-ink-800">
                    {attendee}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-ink-50 px-3 py-3 text-sm text-ink-500">
              לא נמצאו משתתפים המשויכים למפגש.
            </p>
          )}
        </section>

        {session.notes && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <h3 className="font-display font-bold text-amber-900">
              הערות למפגש
            </h3>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-800">
              {session.notes}
            </p>
          </section>
        )}

        <Link
          href={`/classes/${session.classId}`}
          className="ah-btn ah-btn--md ah-btn--outline w-full"
        >
          לעמוד החוג
        </Link>
      </div>
    </Modal>
  );
}

function dateChip(date: string): { day: number; month: string } {
  const value = new Date(`${date}T00:00:00Z`);
  return {
    day: value.getUTCDate(),
    month: new Intl.DateTimeFormat("he-IL", {
      month: "short",
      timeZone: "UTC",
    }).format(value),
  };
}
