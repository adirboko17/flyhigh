"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAppointmentAttendance } from "@/lib/schedule/appointmentAttendance";
import type { AppointmentKind } from "@/lib/schedule/kinds";
import { cn } from "@/utils/cn";
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

export function AppointmentAttendanceControls({
  kind,
  id,
  attendanceStatus,
  disabled,
  compact,
}: {
  kind: AppointmentKind;
  id: string;
  attendanceStatus: Status | null;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(attendanceStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function mark(next: Status) {
    const value = status === next ? null : next;
    setStatus(value);
    setError(null);
    startTransition(async () => {
      const result = await markAppointmentAttendance({
        kind,
        id,
        status: value,
      });
      if (!result.success) {
        setStatus(attendanceStatus);
        setError(result.error ?? "שמירת הנוכחות נכשלה.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled || isPending}
            onClick={() => mark(option.value)}
            className={cn(
              "rounded-full font-semibold transition-colors",
              compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              status === option.value
                ? option.active
                : "bg-ink-100 text-ink-600 hover:bg-ink-200",
              (disabled || isPending) && "opacity-60"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
