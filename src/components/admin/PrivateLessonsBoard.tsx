"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  schedulePrivateLessonSlots,
  updatePrivateLessonSlotStatus,
} from "@/lib/private-lessons/actions";
import { formatCurrency, formatDate } from "@/utils/format";

export type AdminPrivateLessonSlot = {
  id: string;
  status: "awaiting_schedule" | "scheduled" | "cancelled" | "completed";
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  parentName: string;
  parentPhone: string | null;
  childName: string | null;
  lessonTitle: string;
  durationMinutes: number;
  enrollmentId: string;
  amount: number | null;
};

interface PrivateLessonsBoardProps {
  awaiting: AdminPrivateLessonSlot[];
  upcoming: AdminPrivateLessonSlot[];
}

function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function formatClock(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

export function PrivateLessonsBoard({
  awaiting,
  upcoming,
}: PrivateLessonsBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminPrivateLessonSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedIds = useMemo(
    () => new Set(selected.map((slot) => slot.id)),
    [selected]
  );

  function toggle(slot: AdminPrivateLessonSlot) {
    setSelected((current) =>
      current.some((item) => item.id === slot.id)
        ? current.filter((item) => item.id !== slot.id)
        : [...current, slot]
    );
  }

  function run(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setError(null);
    setBusyId(key);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (!result.success) {
        setError(result.error ?? "הפעולה נכשלה.");
        return;
      }
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ממתינים לתיאום</CardTitle>
          <span className="text-sm text-ink-400">{awaiting.length}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {awaiting.length === 0 ? (
            <EmptyState
              title="אין שיעורים שממתינים לתיאום"
              description="כשלקוח רוכש שיעור פרטי הוא יופיע כאן."
              icon="🎯"
              className="border-0 bg-transparent"
            />
          ) : (
            <>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
                {awaiting.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex flex-wrap items-start gap-3 px-4 py-3.5"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded text-brand-600"
                      checked={selectedIds.has(slot.id)}
                      onChange={() => toggle(slot)}
                      disabled={isPending}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">
                        {slot.lessonTitle}
                        <span className="ms-2 text-sm font-normal text-ink-500">
                          {slot.durationMinutes} דק׳
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-ink-600">
                        {slot.parentName}
                        {slot.parentPhone ? ` · ${slot.parentPhone}` : ""}
                        {slot.childName
                          ? ` · עבור ${slot.childName}`
                          : " · עבור ההורה"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        נרכש {formatDate(slot.createdAt)}
                        {slot.amount != null &&
                          ` · ${formatCurrency(slot.amount)}`}
                      </p>
                    </div>
                    <Badge tone="warning">לתיאום</Badge>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-500">
                  נבחרו {selected.length} שיעורים
                </p>
                <ScheduleDialog
                  slots={selected}
                  disabled={isPending || selected.length === 0}
                  busy={busyId === "schedule"}
                  onSchedule={(payload) =>
                    run("schedule", () =>
                      schedulePrivateLessonSlots({ slots: payload })
                    )
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>מתוזמנים בקרוב</CardTitle>
          <span className="text-sm text-ink-400">{upcoming.length}</span>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              title="אין שיעורים מתוזמנים"
              description="אחרי תיאום, השיעורים יופיעו כאן ובלוח השנה."
              icon="📅"
              className="border-0 bg-transparent"
            />
          ) : (
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
              {upcoming.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">
                      {slot.lessonTitle}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {slot.sessionDate && formatDate(slot.sessionDate)} ·{" "}
                      {formatClock(slot.startTime)}–
                      {formatClock(slot.endTime)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {slot.parentName}
                      {slot.childName ? ` · ${slot.childName}` : " · ההורה"}
                      {slot.parentPhone ? ` · ${slot.parentPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        run(`done:${slot.id}`, () =>
                          updatePrivateLessonSlotStatus({
                            slotId: slot.id,
                            status: "completed",
                          })
                        )
                      }
                    >
                      {busyId === `done:${slot.id}` ? "..." : "הושלם"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        run(`cancel:${slot.id}`, () =>
                          updatePrivateLessonSlotStatus({
                            slotId: slot.id,
                            status: "cancelled",
                          })
                        )
                      }
                    >
                      {busyId === `cancel:${slot.id}` ? "..." : "ביטול"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleDialog({
  slots,
  disabled,
  busy,
  onSchedule,
}: {
  slots: AdminPrivateLessonSlot[];
  disabled: boolean;
  busy: boolean;
  onSchedule: (
    payload: { slotId: string; sessionDate: string; startTime: string }[]
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { date: string; time: string }>
  >({});
  const [localError, setLocalError] = useState<string | null>(null);

  function openDialog() {
    const initial: Record<string, { date: string; time: string }> = {};
    for (const slot of slots) {
      initial[slot.id] = { date: todayInput(), time: "16:00" };
    }
    setDrafts(initial);
    setLocalError(null);
    setOpen(true);
  }

  function submit() {
    const payload = slots.map((slot) => {
      const draft = drafts[slot.id] ?? { date: todayInput(), time: "16:00" };
      return {
        slotId: slot.id,
        sessionDate: draft.date,
        startTime: draft.time,
      };
    });

    if (
      payload.some(
        (item) => !item.sessionDate || !item.startTime
      )
    ) {
      setLocalError("נא למלא תאריך ושעה לכל שיעור.");
      return;
    }

    onSchedule(payload);
    setOpen(false);
  }

  return (
    <>
      <Button type="button" disabled={disabled} onClick={openDialog}>
        תיאום נבחרים
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="תיאום שיעורים פרטיים"
        description="הזינו תאריך ושעת התחלה לכל שיעור. שעת הסיום תחושב לפי משך השיעור."
        className="max-w-lg"
      >
        <div className="space-y-4">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="space-y-3 rounded-2xl border border-ink-100 p-3"
            >
              <div>
                <p className="font-semibold text-ink-900">{slot.lessonTitle}</p>
                <p className="text-xs text-ink-500">
                  {slot.parentName}
                  {slot.childName ? ` · ${slot.childName}` : ""} ·{" "}
                  {slot.durationMinutes} דק׳
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="תאריך" required>
                  <Input
                    type="date"
                    value={drafts[slot.id]?.date ?? ""}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [slot.id]: {
                          date: e.target.value,
                          time: current[slot.id]?.time ?? "16:00",
                        },
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="שעת התחלה" required>
                  <Input
                    type="time"
                    value={drafts[slot.id]?.time ?? ""}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [slot.id]: {
                          date: current[slot.id]?.date ?? todayInput(),
                          time: e.target.value,
                        },
                      }))
                    }
                    required
                  />
                </Field>
              </div>
            </div>
          ))}

          {localError && (
            <p className="text-sm text-red-600" role="alert">
              {localError}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              ביטול
            </Button>
            <Button type="button" disabled={busy} onClick={submit}>
              {busy ? "שומר..." : "שמירת תיאום"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
