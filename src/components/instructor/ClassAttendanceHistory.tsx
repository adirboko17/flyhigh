"use client";

import {
  SessionNotesList,
  useClassSessionNotesByDate,
} from "@/components/classes/SessionNotesPanel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ATTENDANCE_STATUS } from "@/lib/constants";
import { formatDate } from "@/utils/format";
import type { Enums } from "@/types";

export interface AttendanceRecord {
  date: string;
  childId: string;
  childName: string;
  status: Enums<"attendance_status">;
}

interface ClassAttendanceHistoryProps {
  classId: string;
  records: AttendanceRecord[];
}

export function ClassAttendanceHistory({
  classId,
  records,
}: ClassAttendanceHistoryProps) {
  const notesByDate = useClassSessionNotesByDate(classId);
  if (records.length === 0) {
    return (
      <EmptyState
        title="אין היסטוריית נוכחות"
        description="עדיין לא סומנה נוכחות לחוג זה."
        icon="📋"
      />
    );
  }

  const byDate = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
    const list = byDate.get(record.date) ?? [];
    list.push(record);
    byDate.set(record.date, list);
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {dates.map((date) => {
        const dayRecords = byDate.get(date) ?? [];
        const present = dayRecords.filter((r) => r.status === "present").length;
        const late = dayRecords.filter((r) => r.status === "late").length;
        const absent = dayRecords.filter((r) => r.status === "absent").length;

        return (
          <div
            key={date}
            className="overflow-hidden rounded-xl border border-ink-100 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3">
              <p className="font-semibold text-ink-900">{formatDate(date)}</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {present > 0 && (
                  <span className="rounded-full bg-aqua-100 px-2 py-0.5 font-semibold text-aqua-700">
                    {present} נוכחים
                  </span>
                )}
                {late > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                    {late} איחורים
                  </span>
                )}
                {absent > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                    {absent} נעדרים
                  </span>
                )}
              </div>
            </div>
            <ul className="divide-y divide-ink-100">
              {dayRecords.map((record) => (
                <li
                  key={`${record.date}-${record.childId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-ink-800">
                    {record.childName}
                  </span>
                  <Badge
                    tone={ATTENDANCE_STATUS[record.status].tone}
                    className="shrink-0"
                  >
                    {ATTENDANCE_STATUS[record.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
            {(notesByDate[date]?.length ?? 0) > 0 && (
              <div className="border-t border-ink-100 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-ink-500">
                  הערות מפגש
                </p>
                <SessionNotesList notes={notesByDate[date] ?? []} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
