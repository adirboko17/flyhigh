import {
  isAppointmentClass,
  type ClassBookingMode,
} from "@/lib/classes/bookingMode";
import { isInterestClass } from "@/lib/classes/interest";

export function offersTrialLesson(cls: {
  trial_lesson_price?: number | null;
  booking_mode?: ClassBookingMode | null;
  interest_only?: boolean | null;
}): boolean {
  if (isInterestClass(cls) || isAppointmentClass(cls)) return false;
  return cls.trial_lesson_price != null && Number(cls.trial_lesson_price) >= 0;
}

export function trialLessonAmount(cls: {
  trial_lesson_price?: number | null;
}): number {
  return Number(cls.trial_lesson_price) || 0;
}

export function trialLessonTitle(classTitle: string): string {
  return `שיעור ניסיון · ${classTitle}`;
}
