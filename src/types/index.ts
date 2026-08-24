import type { Tables, Database } from "./database.types";

export type Profile = Tables<"profiles">;
export type Child = Tables<"children">;
export type Instructor = Tables<"instructors">;
export type InstructorDocument = Tables<"instructor_documents">;
export type BusinessDocument = Tables<"business_documents">;
export type Class = Tables<"classes">;
export type Program = Tables<"programs">;
export type PoolPass = Tables<"pool_passes">;
export type PrivateLesson = Tables<"private_lessons">;
export type PrivateLessonSlot = Tables<"private_lesson_slots">;
export type ActivityBooking = Tables<"activity_bookings">;
export type Enrollment = Tables<"enrollments">;
export type Waitlist = Tables<"waitlist">;
export type Attendance = Tables<"attendance">;
export type ClassSessionNote = Tables<"class_session_notes">;
export type Payment = Tables<"payments">;
export type Receipt = Tables<"receipts">;
export type SystemSetting = Tables<"system_settings">;
export type RecurringIncome = Tables<"recurring_incomes">;

/** חוג עם פרטי מדריכה (לתצוגה). */
export type ClassWithInstructor = Class & {
  instructor?: Pick<Instructor, "id" | "full_name"> | null;
};

/** חוג ציבורי כפי שמוחזר מ-list_public_classes (כולל זמינות ושם מדריכה). */
export type PublicClass =
  Database["public"]["Functions"]["list_public_classes"]["Returns"][number];

export type PublicClassSlot =
  Database["public"]["Functions"]["list_public_class_slots"]["Returns"][number];

export type PublicClassSession =
  Database["public"]["Functions"]["list_public_class_sessions"]["Returns"][number];

export type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";
