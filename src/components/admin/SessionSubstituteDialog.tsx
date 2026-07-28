"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { setSessionSubstitute } from "@/lib/scheduling/substituteActions";
import { cn } from "@/utils/cn";
import type { CalendarSession } from "@/components/admin/ClassCalendar";

interface SessionSubstituteDialogProps {
  open: boolean;
  onClose: () => void;
  session: CalendarSession;
  /** מפגשים נוספים של אותו חוג בהמשך החודש, כדי לכסות היעדרות של כמה שיעורים. */
  upcoming: CalendarSession[];
  instructors: { id: string; full_name: string }[];
}

export function SessionSubstituteDialog({
  open,
  onClose,
  session,
  upcoming,
  instructors,
}: SessionSubstituteDialogProps) {
  const router = useRouter();
  const [instructorId, setInstructorId] = useState(
    session.substituteInstructorId ?? ""
  );
  const [alsoSessionIds, setAlsoSessionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInstructorId(session.substituteInstructorId ?? "");
    setAlsoSessionIds([]);
    setError(null);
  }, [session]);

  const options = instructors.filter((i) => i.id !== session.instructorId);

  async function save(nextInstructorId: string | null) {
    setSaving(true);
    setError(null);

    const result = await setSessionSubstitute({
      sessionIds: [session.id, ...alsoSessionIds],
      instructorId: nextInstructorId,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת ההחלפה נכשלה.");
      return;
    }

    onClose();
    router.refresh();
  }

  function toggleAlso(id: string) {
    setAlsoSessionIds((current) =>
      current.includes(id)
        ? current.filter((sessionId) => sessionId !== id)
        : [...current, id]
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="החלפת מדריכה"
      description={`${session.title} · ${formatDayLabel(session.date)} · ${session.startTime}–${session.endTime}`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-ink-50 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-500">מדריכה קבועה</span>
            <span className="font-semibold text-ink-900">
              {session.instructor ?? "לא שובצה"}
            </span>
          </div>
          {session.substituteInstructor && (
            <div className="mt-1 flex justify-between">
              <span className="text-ink-500">מחליפה כעת</span>
              <span className="font-semibold text-amber-700">
                {session.substituteInstructor}
              </span>
            </div>
          )}
        </div>

        <Field label="מדריכה מחליפה">
          <Select
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            disabled={saving}
          >
            <option value="">בחרו מדריכה</option>
            {options.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.full_name}
              </option>
            ))}
          </Select>
        </Field>

        {upcoming.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-800">
              להחיל גם על מפגשים נוספים של החוג
            </legend>
            <ul className="space-y-2">
              {upcoming.map((other) => {
                const checked = alsoSessionIds.includes(other.id);
                return (
                  <li key={other.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                        checked
                          ? "border-brand-300 bg-brand-50"
                          : "border-ink-100 bg-white hover:border-ink-200"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={() => toggleAlso(other.id)}
                        className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                      />
                      <span className="font-medium text-ink-800">
                        {formatDayLabel(other.date)}
                      </span>
                      <span dir="ltr" className="text-ink-500 tabular-nums">
                        {other.startTime}–{other.endTime}
                      </span>
                      {other.substituteInstructor && (
                        <span className="ms-auto text-xs text-amber-700">
                          מוחלף כעת
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={saving || !instructorId}
            onClick={() => save(instructorId)}
          >
            {saving ? "שומר..." : "שמירת ההחלפה"}
          </Button>
          {session.substituteInstructorId && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => save(null)}
            >
              ביטול ההחלפה
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
