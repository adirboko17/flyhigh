"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { SessionNotesPanel } from "@/components/classes/SessionNotesPanel";
import {
  SessionNavigator,
  defaultSessionIndex,
  type ClassSessionOption,
} from "@/components/instructor/SessionNavigator";
import {
  attendanceRecordKey,
  type AttendanceStudent,
} from "@/lib/attendance/students";
import {
  traineeNoun,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
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
  /** מדריכת החוג; אצל מנהל יכול להיות null אם אין שיוך. */
  instructorId: string | null;
  students: AttendanceStudent[];
  /** כשמוגדר — מציגים רק מפגשים של המועד הזה. */
  weeklySlotId?: string | null;
  /** מפגש מועדף (למשל התאריך שנלחץ בלוח השנה). */
  preferredDate?: string | null;
  /** הודעה כשאין מפגשים — ברירת מחדל מתאימה למדריכה. */
  emptySessionsHint?: string;
  genderPolicy?: ClassGenderPolicy | null;
  onSaved?: () => void;
}

export function ClassAttendanceForm({
  classId,
  instructorId,
  students,
  weeklySlotId = null,
  preferredDate = null,
  emptySessionsHint = "לא נמצאו מפגשים מתוכננים. פני למנהל המערכת לעדכון לוח המפגשים.",
  genderPolicy = null,
  onSaved,
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
  const sessionStudents = selectedSession?.weekly_slot_id
    ? students.filter(
        (child) =>
          !child.weekly_slot_id ||
          child.weekly_slot_id === selectedSession.weekly_slot_id
      )
    : students;
  const markedCount = sessionStudents.filter(
    (child) => marks[child.id] !== undefined
  ).length;
  const unmarkedCount = sessionStudents.length - markedCount;

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("class_sessions")
        .select("id, session_date, start_time, end_time, status, weekly_slot_id")
        .eq("class_id", classId)
        .neq("status", "cancelled")
        .order("session_date")
        .order("start_time");
      if (weeklySlotId) {
        query = query.eq("weekly_slot_id", weeklySlotId);
      }
      const { data } = await query;

      if (cancelled) return;

      const list = (data ?? []) as ClassSessionOption[];
      setSessions(list);
      setSelectedIndex(defaultSessionIndex(list, todayInIsrael(), preferredDate));
      setSessionsLoading(false);
    }

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [classId, weeklySlotId, preferredDate]);

  useEffect(() => {
    if (students.length === 0 || !date) return;

    let cancelled = false;
    async function loadExisting() {
      setLoading(true);
      setSaved(false);
      const supabase = createClient();
      let query = supabase
        .from("attendance")
        .select("child_id, parent_id, status")
        .eq("class_id", classId)
        .eq("date", date);
      if (selectedSession?.id) {
        query = query.eq("session_id", selectedSession.id);
      }
      const { data } = await query;

      if (cancelled) return;

      const existing: Record<string, Status> = {};
      (data ?? []).forEach((row) => {
        const key = attendanceRecordKey(row);
        if (key) existing[key] = row.status;
      });
      setMarks(existing);
      setLoading(false);
    }

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [classId, date, selectedSession?.id, students.length]);

  function handleSessionChange(index: number) {
    setSelectedIndex(index);
    setSaved(false);
  }

  async function save() {
    if (!date) return;
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const rows = sessionStudents
      .filter((child) => marks[child.id] !== undefined)
      .map((child) => ({
        class_id: classId,
        child_id: child.childId,
        parent_id: child.parentId,
        instructor_id: instructorId,
        date,
        session_id: selectedSession?.id ?? null,
        status: marks[child.id]!,
      }));

    if (rows.length > 0) {
      let deleteQuery = supabase
        .from("attendance")
        .delete()
        .eq("class_id", classId)
        .eq("date", date);
      if (selectedSession?.id) {
        deleteQuery = deleteQuery.eq("session_id", selectedSession.id);
      }
      await deleteQuery;
      await supabase.from("attendance").insert(rows);
    }

    setSaving(false);
    setSaved(true);
    onSaved?.();
    router.refresh();
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
          {emptySessionsHint}
        </p>
      ) : (
        <>
          {selectedSession && (
            <SessionNotesPanel sessionId={selectedSession.id} classId={classId} />
          )}

          {sessionStudents.length === 0 ? (
            <p className="rounded-xl bg-ink-50 p-4 text-center text-sm text-ink-500">
              אין נרשמים למועד זה.
            </p>
          ) : loading ? (
            <p className="py-6 text-center text-sm text-ink-500">טוען נוכחות...</p>
          ) : (
            <div className="space-y-2">
              {sessionStudents.map((child) => {
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
                            setMarks((m) => {
                              if (m[child.id] === opt.value) {
                                const next = { ...m };
                                delete next[child.id];
                                return next;
                              }
                              return { ...m, [child.id]: opt.value };
                            })
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

          {sessionStudents.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={save}
                disabled={
                  saving || loading || sessionsLoading || !date || markedCount === 0
                }
              >
                {saving ? "שומר..." : "שמירת נוכחות"}
              </Button>
              {unmarkedCount > 0 &&
                !loading &&
                !sessionsLoading &&
                sessions.length > 0 && (
                <span className="text-sm text-ink-500">
                  {unmarkedCount} {traineeNoun(genderPolicy, unmarkedCount)} טרם
                  סומנו — אפשר לשמור ולחזור להשלים
                </span>
              )}
              {saved && (
                <span className="text-sm font-medium text-aqua-600">
                  ✓ הנוכחות נשמרה
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
