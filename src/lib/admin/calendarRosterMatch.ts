import type { ClassBookingMode } from "@/lib/classes/bookingMode";
import {
  enrollmentHoldsSeat,
  type SeatEnrollment,
} from "@/lib/enrollment/holdsSeat";

export type CalendarRosterEnrollment = SeatEnrollment & {
  session_id?: string | null;
  weekly_slot_id?: string | null;
  is_trial?: boolean | null;
};

export type CalendarRosterSessionFilter = {
  sessionId: string;
  weeklySlotId?: string | null;
  bookingMode?: ClassBookingMode | null;
  pickOneSlot?: boolean;
};

/** אותה סינון לספירה בלוח ולרשימה שנפתחת — לפי תור, מועד שבועי, או כל החוג. */
export function enrollmentMatchesCalendarSession(
  row: CalendarRosterEnrollment,
  session: CalendarRosterSessionFilter
): boolean {
  if (!enrollmentHoldsSeat(row)) return false;
  if (row.is_trial) {
    return row.session_id === session.sessionId;
  }
  if (session.bookingMode === "appointment") {
    return row.session_id === session.sessionId;
  }
  if (!session.weeklySlotId) return true;
  if (row.weekly_slot_id === session.weeklySlotId) return true;
  return !row.weekly_slot_id && !session.pickOneSlot;
}
