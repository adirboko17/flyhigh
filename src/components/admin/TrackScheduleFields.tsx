"use client";

import {
  InstructorSelect,
  instructorOptionLabel,
} from "@/components/admin/InstructorSelect";
import { Field } from "@/components/ui/Input";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";

export function TrackScheduleFields({
  requiresSchedule,
  instructorId,
  instructors,
  onRequiresScheduleChange,
  onInstructorChange,
  disabled,
}: {
  requiresSchedule: boolean;
  instructorId: string;
  instructors: ClassInstructorOption[];
  onRequiresScheduleChange: (value: boolean) => void;
  onInstructorChange: (instructorId: string) => void;
  disabled?: boolean;
}) {
  const instructorName = instructors.find((row) => row.id === instructorId);

  return (
    <div className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
      <p className="text-sm font-semibold text-ink-800">תיאום מועדים ומדריכה</p>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={requiresSchedule}
          onChange={(e) => onRequiresScheduleChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-ink-300 text-brand-600 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed"
        />
        <span>
          <span className="block text-sm font-semibold text-ink-800">
            להכניס לתיאום מועדים
          </span>
          <span className="mt-0.5 block text-xs text-ink-500">
            אחרי רכישה הבקשה תופיע בעמוד תיאום מועדים. משם מתאמים תאריך ומסמנים
            נוכחות. המדריכה המשויכת רואה את אותם מועדים גם בדשבורד שלה.
          </span>
        </span>
      </label>

      <Field
        label="מדריכה (פנימי)"
        hint="רק הצוות רואה את השיוך. הלקוח לא. המדריכה המשויכת רואה את המועדים בדשבורד שלה; מנהלת מסמנת גם בעמוד תיאום מועדים."
      >
        <InstructorSelect
          value={instructorId}
          onChange={onInstructorChange}
          instructors={instructors}
          disabled={disabled}
        />
      </Field>
      {instructorName && !requiresSchedule && (
        <p className="text-xs text-ink-500">
          {instructorOptionLabel(instructorName)} משויכת, אבל בלי תיאום מועדים
          אין מועדים לסימון נוכחות.
        </p>
      )}
    </div>
  );
}
