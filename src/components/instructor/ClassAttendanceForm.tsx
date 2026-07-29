"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  SessionNavigator,
  defaultSessionIndex,
  type ClassSessionOption,
} from "@/components/instructor/SessionNavigator";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";
import type { Enums } from "@/types";

type Status = Enums<"attendance_status">;

const STATUS_OPTIONS: { value: Status; label: string; active: string }[] = [
  { value: "present", label: "נוכח", active: "bg-aqua-500 text-white" },
  { value: "late", label: "איחור", active: "bg-amber-500 text-white" },
  { value: "absent", label: "נעדר", active: "bg-red-500 text-white" },
];

interface ClassAttendanceFormProps {
  classId: string;
  instructorId: string;
  students: { id: string; full_name: string }[];
}

export function ClassAttendanceForm({
  classId,
  instructorId,
  students,
}: ClassAttendanceFormProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ClassSessionOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedSession = sessions[selectedIndex];
  const date = selectedSession?.session_date ?? "";
  const allMarked =
    students.length > 0 && students.every((child) => marks[child.id] !== undefined);
  const unmarkedCount = students.filter((child) => marks[child.id] === undefined).length;

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("class_sessions")
        .select("id, session_date, start_time, end_time, status")
        .eq("class_id", classId)
        .neq("status", "cancelled")
        .order("session_date")
        .order("start_time");

      if (cancelled) return;

      const list = (data ?? []) as ClassSessionOption[];
      setSessions(list);
      setSelectedIndex(defaultSessionIndex(list, todayInIsrael()));
      setSessionsLoading(false);
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  useEffect(() => {
    if (students.length === 0 || !date) return;

    let cancelled = false;
    async function loadExisting() {
      setLoading(true);
      setSaved(false);
      const supabase = createClient();
      const { data } = await supabase
        .from("attendance")
        .select("child_id, status")
        .eq("class_id", classId)
        .eq("date", date);

      if (cancelled) return;

      const existing: Record<string, Status> = {};
      (data ?? []).forEach((row) => {
        existing[row.child_id] = row.status;
      });
      setMarks(existing);
      setLoading(false);
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [classId, date, students.length]);

  function handleSessionChange(index: number) {
    setSelectedIndex(index);
    setSaved(false);
  }

  async function save() {
    if (!date) return;
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const rows = students
      .filter((child) => marks[child.id] !== undefined)
      .map((child) => ({
        class_id: classId,
        child_id: child.id,
        instructor_id: instructorId,
        date,
        status: marks[child.id]!,
      }));

    if (rows.length > 0) {
      await supabase
        .from("attendance")
        .delete()
        .eq("class_id", classId)
        .eq("date", date);
      await supabase.from("attendance").insert(rows);
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">
        אין תלמידים רשומים בחוג זה.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sessionsLoading ? (
        <p className="rounded-xl bg-ink-50 py-8 text-center text-sm text-ink-500">
          טוען מפגשים...
        </p>
      ) : (
        <SessionNavigator
          sessions={sessions}
          selectedIndex={selectedIndex}
          onSelectIndex={handleSessionChange}
        />
      )}

      {!sessionsLoading && sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center text-sm text-ink-500">
          לא נמצאו מפגשים מתוכננים. פני למנהל המערכת לעדכון לוח המפגשים.
        </p>
      ) : loading ? (
        <p className="py-6 text-center text-sm text-ink-500">טוען נוכחות...</p>
      ) : (
        <div className="space-y-2">
          {students.map((child) => {
            const current = marks[child.id];
            return (
              <div
                key={child.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-white p-3 md:flex-row md:items-center md:justify-between",
                  current === undefined
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-ink-100"
                )}
              >
                <span className="min-w-0 truncate font-medium text-ink-800">
                  {child.full_name}
                </span>
                <div className="flex gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setMarks((m) => ({ ...m, [child.id]: opt.value }))
                      }
                      className={cn(
                        "min-h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors md:flex-none md:px-3.5",
                        current === opt.value
                          ? opt.active
                          : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={save}
          disabled={saving || loading || sessionsLoading || !date || !allMarked}
        >
          {saving ? "שומר..." : "שמירת נוכחות"}
        </Button>
        {!allMarked && !loading && !sessionsLoading && sessions.length > 0 && (
          <span className="text-sm text-amber-600">
            נותרו {unmarkedCount} תלמידים לסימון
          </span>
        )}
        {saved && (
          <span className="text-sm font-medium text-aqua-600">
            ✓ הנוכחות נשמרה
          </span>
        )}
      </div>
    </div>
  );
}
