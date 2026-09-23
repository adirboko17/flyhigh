"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppointmentAttendanceControls } from "@/components/schedule/AppointmentAttendanceControls";
import { ATTENDANCE_STATUS } from "@/lib/constants";
import type { AppointmentKind } from "@/lib/schedule/kinds";
import type { ScheduledAppointment } from "@/lib/schedule/appointments";
import { formatDate, formatTime } from "@/utils/format";

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
          {row.attendanceStatus && (
            <Badge
              tone={ATTENDANCE_STATUS[row.attendanceStatus].tone}
              className="mt-2 px-1.5 py-0 text-[10px]"
            >
              {ATTENDANCE_STATUS[row.attendanceStatus].label}
            </Badge>
          )}
        </div>
        <AppointmentAttendanceControls
          kind={row.kind}
          id={row.id}
          attendanceStatus={row.attendanceStatus}
        />
      </CardContent>
    </Card>
  );
}
