"use client";

import { Icon } from "@/components/icons/Icon";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";
import { formatDate, formatTime } from "@/utils/format";
import type { Enums } from "@/types";

export type ClassSessionOption = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: Enums<"class_session_status">;
};

interface SessionNavigatorProps {
  sessions: ClassSessionOption[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export function SessionNavigator({
  sessions,
  selectedIndex,
  onSelectIndex,
}: SessionNavigatorProps) {
  const session = sessions[selectedIndex];
  const canGoEarlier = selectedIndex > 0;
  const canGoLater = selectedIndex < sessions.length - 1;

  if (!session) {
    return (
      <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">
        אין מפגשים מתוכננים לחוג זה.
      </p>
    );
  }

  const isToday = session.session_date === todayInIsrael();

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 sm:p-4">
      <p className="mb-2 text-center text-xs font-semibold text-ink-500">
        בחירת מפגש
      </p>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* ב-RTL הכפתור הראשון מוצג מימין — מפגש קודם (earlier) */}
        <NavButton
          label="מפגש קודם"
          disabled={!canGoEarlier}
          onClick={() => onSelectIndex(selectedIndex - 1)}
        >
          <Icon name="arrow" size={18} className="rotate-180" />
        </NavButton>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-medium text-ink-500">
            מפגש {selectedIndex + 1} מתוך {sessions.length}
            {isToday && (
              <span className="ms-1.5 rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">
                היום
              </span>
            )}
          </p>
          <p className="mt-0.5 font-display text-base font-bold text-ink-900 sm:text-lg">
            {formatDate(session.session_date)}
          </p>
          <p
            dir="ltr"
            className="mt-0.5 text-sm tabular-nums text-ink-500"
          >
            {formatTime(session.start_time)}–{formatTime(session.end_time)}
          </p>
        </div>

        {/* ב-RTL הכפתור האחרון מוצג משמאל — מפגש הבא (later) */}
        <NavButton
          label="מפגש הבא"
          disabled={!canGoLater}
          onClick={() => onSelectIndex(selectedIndex + 1)}
        >
          <Icon name="arrow" size={18} />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-95"
      )}
    >
      {children}
    </button>
  );
}

/** מפגש היום, אחרת הקרוב הבא, אחרת האחרון שעבר. */
export function defaultSessionIndex(
  sessions: ClassSessionOption[],
  today: string
): number {
  if (sessions.length === 0) return 0;

  const todayIdx = sessions.findIndex((s) => s.session_date === today);
  if (todayIdx !== -1) return todayIdx;

  const futureIdx = sessions.findIndex((s) => s.session_date > today);
  if (futureIdx !== -1) return futureIdx;

  return sessions.length - 1;
}
