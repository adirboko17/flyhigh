"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  scheduleActivityBookings,
  updateActivityBookingStatus,
} from "@/lib/activities/actions";
import {
  schedulePrivateLessonSlots,
  updatePrivateLessonSlotStatus,
} from "@/lib/private-lessons/actions";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate } from "@/utils/format";

export type ScheduleKind = "private_lesson" | "activity";

export type AdminScheduleRow = {
  id: string;
  kind: ScheduleKind;
  title: string;
  status: "awaiting_schedule" | "scheduled";
  sessionDate: string | null;
  startTime: string | null;
  createdAt: string;
  parentName: string;
  parentPhone: string | null;
  childName: string | null;
  detail: string | null;
  amount: number | null;
};

function todayInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function clockValue(value: string | null) {
  return value ? value.slice(0, 5) : "16:00";
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
}

function matchesScheduleRow(row: AdminScheduleRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const phoneQuery = phoneDigits(query);
  const phone = phoneDigits(row.parentPhone ?? "");
  return (
    normalizeSearch(row.parentName).includes(q) ||
    normalizeSearch(row.childName ?? "").includes(q) ||
    (phoneQuery.length > 0 && phone.includes(phoneQuery))
  );
}

const controlClass = "h-10 px-2.5 text-sm";

export function ScheduleBoard({ rows }: { rows: AdminScheduleRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => rows.filter((row) => matchesScheduleRow(row, query)),
    [rows, query]
  );
  const awaitingCount = filtered.filter(
    (row) => row.status === "awaiting_schedule"
  ).length;
  const searching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <CardTitle>תיאום מועדים</CardTitle>
          <Badge tone={awaitingCount > 0 ? "warning" : "neutral"}>
            {awaitingCount > 0 ? `${awaitingCount} ממתינים` : filtered.length}
          </Badge>
        </div>
        <span className="text-sm text-ink-400">
          {searching
            ? `${filtered.length} מתוך ${rows.length}`
            : `${rows.length} בסך הכל`}
        </span>
      </CardHeader>
      {rows.length > 0 && (
        <div className="border-b border-ink-100 px-5 py-3">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם או מספר טלפון"
            className="h-10 border-ink-100 bg-ink-50/50 focus:bg-white"
            aria-label="חיפוש לפי שם או מספר טלפון"
          />
        </div>
      )}
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            title="אין בקשות לתיאום"
            description="כשלקוח רוכש שיעור פרטי או פעילות, הבקשה תופיע כאן. אחרי בחירת תאריך זה ייכנס ללוח השנה."
            icon="📅"
            className="border-0 bg-transparent"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="לא נמצאו תוצאות"
            description="נסו שם או מספר טלפון אחר, או נקו את החיפוש."
            icon="🔎"
            className="border-0 bg-transparent"
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>לקוח</TH>
                <TH>מה נרכש</TH>
                <TH>סטטוס</TH>
                <TH>תאריך</TH>
                <TH>שעה</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((row) => (
                <ScheduleRow key={`${row.kind}-${row.id}`} row={row} />
              ))}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({ row }: { row: AdminScheduleRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [date, setDate] = useState(row.sessionDate ?? "");
  const [time, setTime] = useState(clockValue(row.startTime));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function persist(
    next: {
      status: AdminScheduleRow["status"];
      date: string;
      time: string;
    }
  ) {
    setError(null);
    startTransition(async () => {
      const result =
        next.status === "awaiting_schedule"
          ? row.kind === "activity"
            ? await updateActivityBookingStatus({
                bookingId: row.id,
                status: "awaiting_schedule",
              })
            : await updatePrivateLessonSlotStatus({
                slotId: row.id,
                status: "awaiting_schedule",
              })
          : row.kind === "activity"
            ? await scheduleActivityBookings({
                bookings: [
                  {
                    bookingId: row.id,
                    sessionDate: next.date,
                    startTime: next.time,
                  },
                ],
              })
            : await schedulePrivateLessonSlots({
                slots: [
                  {
                    slotId: row.id,
                    sessionDate: next.date,
                    startTime: next.time,
                  },
                ],
              });

      if (!result.success) {
        setError(result.error ?? "שמירת התיאום נכשלה.");
        return;
      }
      router.refresh();
    });
  }

  function handleStatus(next: AdminScheduleRow["status"]) {
    setStatus(next);
    if (next === "awaiting_schedule") {
      persist({ status: next, date, time });
      return;
    }
    const nextDate = date || todayInput();
    const nextTime = time || "16:00";
    setDate(nextDate);
    setTime(nextTime);
    persist({ status: next, date: nextDate, time: nextTime });
  }

  function commitDateTime(nextDate: string, nextTime: string) {
    if (!nextDate) {
      if (status === "scheduled") {
        setStatus("awaiting_schedule");
        persist({ status: "awaiting_schedule", date: "", time: nextTime });
      }
      return;
    }
    const nextClock = nextTime || "16:00";
    const unchanged =
      status === "scheduled" &&
      nextDate === (row.sessionDate ?? "") &&
      nextClock === clockValue(row.startTime);
    if (unchanged) return;
    setStatus("scheduled");
    persist({
      status: "scheduled",
      date: nextDate,
      time: nextClock,
    });
  }

  return (
    <TR className={cn(row.status === "awaiting_schedule" && "bg-amber-50/50")}>
      <TD className="min-w-[12rem]">
        <p className="font-semibold text-ink-900">{row.parentName}</p>
        <p className="text-xs font-normal text-ink-500">
          {row.childName ? `עבור ${row.childName}` : "עבור ההורה"}
          {row.parentPhone ? (
            <>
              {" · "}
              <a
                href={`tel:${row.parentPhone}`}
                className="text-brand-700 hover:underline"
                dir="ltr"
              >
                {row.parentPhone}
              </a>
            </>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          נרכש {formatDate(row.createdAt)}
          {row.amount != null && ` · ${formatCurrency(row.amount)}`}
        </p>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </TD>
      <TD className="min-w-[10rem]">
        <p className="font-semibold text-ink-900">{row.title}</p>
        <p className="text-xs font-normal text-ink-500">
          {row.kind === "activity" ? "פעילות" : "שיעור פרטי"}
          {row.detail ? ` · ${row.detail}` : ""}
        </p>
      </TD>
      <TD className="w-44">
        <Select
          className={controlClass}
          value={status}
          disabled={isPending}
          onChange={(e) =>
            handleStatus(
              e.target.value === "scheduled"
                ? "scheduled"
                : "awaiting_schedule"
            )
          }
        >
          <option value="awaiting_schedule">לא תואם מועד</option>
          <option value="scheduled">תואם מועד</option>
        </Select>
      </TD>
      <TD className="w-40">
        <Input
          type="date"
          className={controlClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={(e) => commitDateTime(e.target.value, time)}
        />
      </TD>
      <TD className="w-32">
        <Input
          type="time"
          className={controlClass}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={(e) => {
            if (date) commitDateTime(date, e.target.value);
          }}
        />
      </TD>
    </TR>
  );
}
