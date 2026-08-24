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
  scheduleActivityBookings,
  updateActivityBookingStatus,
} from "@/lib/activities/actions";
import { formatCurrency, formatDate } from "@/utils/format";

export type AdminActivityBooking = {
  id: string;
  status: "awaiting_schedule" | "scheduled" | "cancelled" | "completed";
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  parentName: string;
  parentPhone: string | null;
  childName: string | null;
  title: string;
  peopleCount: number;
  enrollmentId: string;
  amount: number | null;
};

interface ActivityBookingsBoardProps {
  awaiting: AdminActivityBooking[];
  upcoming: AdminActivityBooking[];
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

function peopleLabel(count: number) {
  return `${count} ${count === 1 ? "נפש" : "נפשות"}`;
}

export function ActivityBookingsBoard({
  awaiting,
  upcoming,
}: ActivityBookingsBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminActivityBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedIds = useMemo(
    () => new Set(selected.map((booking) => booking.id)),
    [selected]
  );

  function toggle(booking: AdminActivityBooking) {
    setSelected((current) =>
      current.some((item) => item.id === booking.id)
        ? current.filter((item) => item.id !== booking.id)
        : [...current, booking]
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
          <CardTitle>פעילויות ממתינות לתיאום</CardTitle>
          <span className="text-sm text-ink-400">{awaiting.length}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {awaiting.length === 0 ? (
            <EmptyState
              title="אין פעילויות שממתינות לתיאום"
              description="כשלקוח רוכש פעילות לפי מספר נפשות היא תופיע כאן."
              icon="👨‍👩‍👧"
              className="border-0 bg-transparent"
            />
          ) : (
            <>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
                {awaiting.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-start gap-3 px-4 py-3.5"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded text-brand-600"
                      checked={selectedIds.has(booking.id)}
                      onChange={() => toggle(booking)}
                      disabled={isPending}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">
                        {booking.title}
                        <span className="ms-2 text-sm font-normal text-ink-500">
                          {peopleLabel(booking.peopleCount)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-ink-600">
                        {booking.parentName}
                        {booking.parentPhone ? ` · ${booking.parentPhone}` : ""}
                        {booking.childName
                          ? ` · עבור ${booking.childName}`
                          : " · עבור ההורה"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        נרכש {formatDate(booking.createdAt)}
                        {booking.amount != null &&
                          ` · ${formatCurrency(booking.amount)}`}
                      </p>
                    </div>
                    <Badge tone="warning">לתיאום</Badge>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-500">
                  נבחרו {selected.length} פעילויות
                </p>
                <ScheduleDialog
                  bookings={selected}
                  disabled={isPending || selected.length === 0}
                  busy={busyId === "schedule"}
                  onSchedule={(payload) =>
                    run("schedule", () =>
                      scheduleActivityBookings({ bookings: payload })
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
          <CardTitle>פעילויות מתוזמנות</CardTitle>
          <span className="text-sm text-ink-400">{upcoming.length}</span>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              title="אין פעילויות מתוזמנות"
              description="אחרי תיאום, הפעילויות יופיעו כאן ובלוח השנה."
              icon="📅"
              className="border-0 bg-transparent"
            />
          ) : (
            <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100">
              {upcoming.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">
                      {booking.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {booking.sessionDate && formatDate(booking.sessionDate)} ·{" "}
                      {formatClock(booking.startTime)}–
                      {formatClock(booking.endTime)}
                      {` · ${peopleLabel(booking.peopleCount)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {booking.parentName}
                      {booking.childName ? ` · ${booking.childName}` : " · ההורה"}
                      {booking.parentPhone ? ` · ${booking.parentPhone}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        run(`done:${booking.id}`, () =>
                          updateActivityBookingStatus({
                            bookingId: booking.id,
                            status: "completed",
                          })
                        )
                      }
                    >
                      {busyId === `done:${booking.id}` ? "..." : "הושלם"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        run(`cancel:${booking.id}`, () =>
                          updateActivityBookingStatus({
                            bookingId: booking.id,
                            status: "cancelled",
                          })
                        )
                      }
                    >
                      {busyId === `cancel:${booking.id}` ? "..." : "ביטול"}
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
  bookings,
  disabled,
  busy,
  onSchedule,
}: {
  bookings: AdminActivityBooking[];
  disabled: boolean;
  busy: boolean;
  onSchedule: (
    payload: { bookingId: string; sessionDate: string; startTime: string }[]
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { date: string; time: string }>
  >({});
  const [localError, setLocalError] = useState<string | null>(null);

  function openDialog() {
    const initial: Record<string, { date: string; time: string }> = {};
    for (const booking of bookings) {
      initial[booking.id] = { date: todayInput(), time: "16:00" };
    }
    setDrafts(initial);
    setLocalError(null);
    setOpen(true);
  }

  function submit() {
    const payload = bookings.map((booking) => {
      const draft = drafts[booking.id] ?? { date: todayInput(), time: "16:00" };
      return {
        bookingId: booking.id,
        sessionDate: draft.date,
        startTime: draft.time,
      };
    });

    if (payload.some((item) => !item.sessionDate || !item.startTime)) {
      setLocalError("נא למלא תאריך ושעה לכל פעילות.");
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
        title="תיאום פעילות"
        description="הזינו תאריך ושעת התחלה. ניצור קשר עם הלקוח לפי הפרטים שכאן."
        className="max-w-lg"
      >
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="space-y-3 rounded-2xl border border-ink-100 p-3"
            >
              <div>
                <p className="font-semibold text-ink-900">{booking.title}</p>
                <p className="text-xs text-ink-500">
                  {booking.parentName}
                  {booking.childName ? ` · ${booking.childName}` : ""} ·{" "}
                  {peopleLabel(booking.peopleCount)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="תאריך" required>
                  <Input
                    type="date"
                    value={drafts[booking.id]?.date ?? ""}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [booking.id]: {
                          date: e.target.value,
                          time: current[booking.id]?.time ?? "16:00",
                        },
                      }))
                    }
                    required
                  />
                </Field>
                <Field label="שעת התחלה" required>
                  <Input
                    type="time"
                    value={drafts[booking.id]?.time ?? ""}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [booking.id]: {
                          date: current[booking.id]?.date ?? todayInput(),
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
