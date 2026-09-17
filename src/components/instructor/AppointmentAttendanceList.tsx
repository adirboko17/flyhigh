"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ATTENDANCE_STATUS } from "@/lib/constants";
import {
  markAppointmentAttendance,
} from "@/lib/schedule/appointmentAttendance";
import type { AppointmentKind } from "@/lib/schedule/kinds";
import type { ScheduledAppointment } from "@/lib/schedule/appointments";
import { cn } from "@/utils/cn";
import { formatDate, formatTime } from "@/utils/format";
import type { Enums } from "@/types";

type Status = Enums<"attendance_status">;

const STATUS_OPTIONS: {
  value: Status;
  label: string;
  active: string;
}[] = [
  { value: "present", label: "נוכח", active: "bg-aqua-500 text-white" },
  { value: "late", label: "איחור", active: "bg-amber-500 text-white" },
  { value: "absent", label: "נעדר", active: "bg-red-500 text-white" },
  {
    value: "advance_notice",
    label: "עדכון מראש",
    active: "bg-sky-600 text-white",
  },
];

const KIND_LABEL: Record<AppointmentKind, string> = {
  private_lesson: "שיעור פרטי",
  activity: "פעילות",
  pool_pass: "כרטיסייה",
};

export function AppointmentAttendanceList({
  appointments,
}: {
  appointments: ScheduledAppointment[];
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        title="אין מועדים לסימון"
        description="כשיתאמו מועדים למסלולים שמשויכים אליכם, הם יופיעו כאן לסימון נוכחות."
        icon="📅"
      />
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((row) => (
        <AppointmentAttendanceCard key={`${row.kind}-${row.id}`} row={row} />
      ))}
    </div>
  );
}

function AppointmentAttendanceCard({ row }: { row: ScheduledAppointment }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.attendanceStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function mark(next: Status) {
    const value = status === next ? null : next;
    setStatus(value);
    setError(null);
    startTransition(async () => {
      const result = await markAppointmentAttendance({
        kind: row.kind,
        id: row.id,
        status: value,
      });
      if (!result.success) {
        setStatus(row.attendanceStatus);
        setError(result.error ?? "שמירת הנוכחות נכשלה.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{row.title}</p>
          <p className="mt-0.5 text-sm text-ink-500">
            {KIND_LABEL[row.kind]} · {formatDate(row.sessionDate)} ·{" "}
            <span dir="ltr" className="tabular-nums">
              {formatTime(row.startTime)}
              {row.endTime ? `–${formatTime(row.endTime)}` : ""}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink-400">
            {row.childName
              ? `${row.parentName} · ${row.childName}`
              : row.parentName}
          </p>
          {status && (
            <Badge
              tone={ATTENDANCE_STATUS[status].tone}
              className="mt-2 px-1.5 py-0 text-[10px]"
            >
              {ATTENDANCE_STATUS[status].label}
            </Badge>
          )}
          {error && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => mark(option.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                status === option.value
                  ? option.active
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200",
                isPending && "opacity-60"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
