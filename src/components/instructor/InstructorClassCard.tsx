"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SessionNotesWorkspace } from "@/components/classes/SessionNotesPanel";
import { ClassAttendanceForm } from "@/components/instructor/ClassAttendanceForm";
import {
  ClassAttendanceHistory,
  type AttendanceRecord,
} from "@/components/instructor/ClassAttendanceHistory";
import { CLASS_STATUS, DAY_ABBR, dayLabel } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { formatDateShort, formatTime } from "@/utils/format";
import type { Enums } from "@/types";

export interface InstructorClassData {
  id: string;
  title: string;
  status: Enums<"class_status">;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  studentCount: number;
  students: { id: string; full_name: string; weekly_slot_id?: string | null }[];
  attendanceHistory: AttendanceRecord[];
  /** האם החוג מתקיים היום — הכרטיס מודגש והפעולה הופכת לראשית. */
  isToday: boolean;
}

interface InstructorClassCardProps {
  classData: InstructorClassData;
  instructorId: string;
}

export function InstructorClassCard({
  classData,
  instructorId,
}: InstructorClassCardProps) {
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    title,
    status,
    dayOfWeek,
    startTime,
    endTime,
    capacity,
    studentCount,
    students,
    attendanceHistory,
    isToday,
  } = classData;

  const latestDate = attendanceHistory[0]?.date;
  const sessionCount = new Set(attendanceHistory.map((r) => r.date)).size;
  const presentCount = attendanceHistory.filter(
    (r) => r.status !== "absent"
  ).length;
  const attendanceRate =
    attendanceHistory.length > 0
      ? Math.round((presentCount / attendanceHistory.length) * 100)
      : null;

  const fillPercent =
    capacity > 0 ? Math.min(Math.round((studentCount / capacity) * 100), 100) : 0;
  const dayAbbr = dayOfWeek !== null ? DAY_ABBR[dayOfWeek] : "–";

  return (
    <>
      <Card
        className={cn(
          "flex flex-col overflow-hidden transition-shadow hover:shadow-soft",
          isToday && "ring-2 ring-brand-300"
        )}
      >
        <div
          aria-hidden
          className={cn(
            "h-1.5 w-full",
            isToday ? "bg-brand-gradient" : "bg-ink-100"
          )}
        />

        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl",
                isToday
                  ? "bg-brand-100 text-brand-700"
                  : "bg-ink-50 text-ink-600"
              )}
            >
              <span className="font-display text-base font-extrabold leading-none">
                {dayAbbr}
              </span>
              <span
                dir="ltr"
                className="mt-1 text-[10px] font-medium leading-none tabular-nums opacity-70"
              >
                {formatTime(startTime)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="break-words font-display text-base font-bold text-ink-900 sm:text-lg">
                {title}
              </h3>
              <p className="mt-0.5 text-xs text-ink-500">
                יום {dayLabel(dayOfWeek)} ·{" "}
                <span dir="ltr" className="tabular-nums">
                  {formatTime(startTime)}–{formatTime(endTime)}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {isToday && <Badge tone="brand">היום</Badge>}
              <Badge tone={CLASS_STATUS[status].tone}>
                {CLASS_STATUS[status].label}
              </Badge>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-500">תלמידים רשומים</span>
              <span className="font-semibold tabular-nums text-ink-800">
                {studentCount}
                <span className="text-ink-400"> / {capacity}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  fillPercent >= 100 ? "bg-amber-500" : "bg-aqua-500"
                )}
                style={{ width: `${Math.max(fillPercent, 2)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-ink-50 px-3 py-2.5">
            {latestDate ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-ink-600">
                  נוכחות אחרונה{" "}
                  <span className="font-semibold text-ink-800">
                    {formatDateShort(latestDate)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  {attendanceRate !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        attendanceRate >= 80
                          ? "bg-aqua-100 text-aqua-700"
                          : attendanceRate >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      )}
                    >
                      {attendanceRate}% נוכחות
                    </span>
                  )}
                  <span className="text-ink-400">{sessionCount} מפגשים</span>
                </span>
              </div>
            ) : (
              <p className="text-xs text-ink-400">
                עדיין לא סומנה נוכחות בחוג זה.
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2.5">
            <Button
              variant={isToday ? "primary" : "secondary"}
              className="h-12 w-full text-sm sm:h-11"
              onClick={() => setAttendanceOpen(true)}
            >
              סימון נוכחות
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                className="h-12 w-full text-sm sm:h-11"
                onClick={() => setNotesOpen(true)}
              >
                הערות מפגש
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full text-sm sm:h-11"
                onClick={() => setHistoryOpen(true)}
                disabled={sessionCount === 0}
              >
                היסטוריה
                {sessionCount > 0 && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs tabular-nums">
                    {sessionCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        title={`סימון נוכחות — ${title}`}
        description="נווטו בין המפגשים וסמנו נוכחות לכל תלמיד"
        className="max-w-xl"
      >
        <ClassAttendanceForm
          classId={classData.id}
          instructorId={instructorId}
          students={students}
        />
      </Modal>

      <Modal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={`הערות מפגש — ${title}`}
        description="בחרו מפגש והוסיפו הערה — למשל דיווח פציעה. גלוי למדריכה ולמנהל בלבד."
        className="max-w-xl"
      >
        <SessionNotesWorkspace classId={classData.id} />
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`היסטוריית נוכחות — ${title}`}
        description="סימוני נוכחות קודמים לפי תאריך"
        className="max-w-xl"
      >
        <ClassAttendanceHistory
          classId={classData.id}
          records={attendanceHistory}
        />
      </Modal>
    </>
  );
}
