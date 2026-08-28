import type { Enums } from "@/types/database.types";

export type ClassBookingMode = Enums<"class_booking_mode">;

export function isAppointmentClass(cls: {
  booking_mode?: ClassBookingMode | null;
}): boolean {
  return cls.booking_mode === "appointment";
}

export function appointmentSessionLabel(
  sessionDate: string,
  startTime: string,
  endTime?: string | null
): string {
  const start = startTime.slice(0, 5);
  const end = endTime ? endTime.slice(0, 5) : null;
  return end ? `${sessionDate} · ${start}–${end}` : `${sessionDate} · ${start}`;
}
