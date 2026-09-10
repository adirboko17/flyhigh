"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  REGISTRATION_KIND_LABEL,
  REGISTRATION_KIND_ORDER,
  type CustomerRegistration,
  type CustomerRegistrationKind,
} from "@/lib/admin/customerRegistrationTypes";
import {
  isAbandonedCardcomEnrollment,
  type SeatPayment,
} from "@/lib/enrollment/holdsSeat";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  WAITLIST_STATUS,
  DAYS_OF_WEEK,
} from "@/lib/constants";
import { formatDate, formatTime } from "@/utils/format";
import type { Enums } from "@/types/database.types";

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function scheduleLabel(
  dayOfWeek: number | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  if (dayOfWeek == null || !startTime) return null;
  const day = DAYS_OF_WEEK[dayOfWeek] ?? dayOfWeek;
  if (!endTime) return `יום ${day} · ${formatTime(startTime)}`;
  return `יום ${day} · ${formatTime(startTime)}–${formatTime(endTime)}`;
}

function registrationKind(
  type: Enums<"enrollment_type">,
  programKind: Enums<"program_kind"> | null | undefined
): CustomerRegistrationKind {
  if (type === "class") return "class";
  if (type === "pool_pass") return "pool_pass";
  if (type === "private_lesson") return "private_lesson";
  if (programKind === "activity") return "activity";
  return "membership";
}

export async function loadCustomerRegistrations(
  parentId: string,
  parentName: string
): Promise<CustomerRegistration[]> {
  try {
    return await loadCustomerRegistrationsUnsafe(parentId, parentName);
  } catch (error) {
    console.error("loadCustomerRegistrations", parentId, error);
    return [];
  }
}

async function loadCustomerRegistrationsUnsafe(
  parentId: string,
  parentName: string
): Promise<CustomerRegistration[]> {
  const supabase = await createAdminDataClient();

  const [{ data: enrollments, error: enrollmentsError }, { data: waitlist, error: waitlistError }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          "id, type, status, payment_status, created_at, starts_on, ends_on, people_count, weekly_slot_id, session_id, is_trial, children(full_name), classes(title, day_of_week, start_time, end_time, interest_only), programs(title, kind, duration_minutes), pool_passes(title, entries_count), private_lessons(title, duration_minutes)"
        )
        .eq("parent_id", parentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("waitlist")
        .select("id, status, created_at, children(full_name), classes(title)")
        .eq("parent_id", parentId)
        .in("status", ["waiting", "offered"])
        .order("created_at", { ascending: false }),
    ]);

  if (enrollmentsError) {
    console.error("loadCustomerRegistrations enrollments", enrollmentsError);
  }
  if (waitlistError) {
    console.error("loadCustomerRegistrations waitlist", waitlistError);
  }

  const enrollmentRows = enrollments ?? [];
  const slotIds = [
    ...new Set(
      enrollmentRows
        .map((row) => row.weekly_slot_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const enrollmentIds = enrollmentRows.map((row) => row.id);
  const slotsById = new Map<
    string,
    { day_of_week: number; start_time: string; end_time: string }
  >();
  const paymentsByEnrollment = new Map<string, SeatPayment[]>();
  const sessionsById = new Map<
    string,
    { session_date: string; start_time: string; end_time: string }
  >();
  const sessionIds = [
    ...new Set(
      enrollmentRows
        .map((row) => row.session_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (slotIds.length > 0 || enrollmentIds.length > 0 || sessionIds.length > 0) {
    const [{ data: slots }, { data: paymentRows }, { data: sessions }] =
      await Promise.all([
        slotIds.length > 0
          ? supabase
              .from("class_weekly_slots")
              .select("id, day_of_week, start_time, end_time")
              .in("id", slotIds)
          : Promise.resolve({ data: [] }),
        enrollmentIds.length > 0
          ? supabase
              .from("payments")
              .select(
                "enrollment_id, status, payment_method, external_reference, office_collection"
              )
              .in("enrollment_id", enrollmentIds)
          : Promise.resolve({ data: [] }),
        sessionIds.length > 0
          ? supabase
              .from("class_sessions")
              .select("id, session_date, start_time, end_time")
              .in("id", sessionIds)
          : Promise.resolve({ data: [] }),
      ]);
    for (const slot of slots ?? []) {
      slotsById.set(slot.id, slot);
    }
    for (const payment of paymentRows ?? []) {
      if (!payment.enrollment_id) continue;
      const list = paymentsByEnrollment.get(payment.enrollment_id) ?? [];
      list.push(payment);
      paymentsByEnrollment.set(payment.enrollment_id, list);
    }
    for (const session of sessions ?? []) {
      sessionsById.set(session.id, session);
    }
  }

  const rows: CustomerRegistration[] = [];

  for (const row of enrollments ?? []) {
    try {
      if (
        isAbandonedCardcomEnrollment({
          ...row,
          payments: paymentsByEnrollment.get(row.id) ?? [],
        })
      ) {
        continue;
      }
      const program = asOne(row.programs);
      const child = asOne(row.children);
      const cls = asOne(row.classes);
      const pass = asOne(row.pool_passes);
      const lesson = asOne(row.private_lessons);
      const kind = registrationKind(row.type, program?.kind);
      const participant = child?.full_name?.trim() || parentName;
      const slot = row.weekly_slot_id
        ? slotsById.get(row.weekly_slot_id)
        : undefined;
      const details: string[] = [];

      if (kind === "class") {
        const bookedSession = row.session_id
          ? sessionsById.get(row.session_id)
          : undefined;
        const schedule = bookedSession?.session_date
          ? `${bookedSession.session_date} · ${String(bookedSession.start_time).slice(0, 5)}`
          : scheduleLabel(
              slot?.day_of_week ?? cls?.day_of_week,
              slot?.start_time ?? cls?.start_time,
              slot?.end_time ?? cls?.end_time
            ) ?? (cls?.interest_only ? "הרשמת עניין" : null);
        if (schedule) details.push(schedule);
      } else if (kind === "membership") {
        if (row.ends_on) details.push(`בתוקף עד ${formatDate(row.ends_on)}`);
        else if (row.starts_on) details.push(`מ-${formatDate(row.starts_on)}`);
      } else if (kind === "pool_pass") {
        const entries = pass?.entries_count;
        if (entries != null) {
          details.push(entries === 1 ? "כניסה אחת" : `${entries} כניסות`);
        }
      } else if (kind === "private_lesson") {
        const duration = lesson?.duration_minutes;
        if (duration != null) details.push(`${duration} דק׳`);
      } else if (kind === "activity") {
        const duration = program?.duration_minutes;
        if (duration != null) details.push(`${duration} דק׳`);
        if (row.people_count != null) {
          details.push(
            row.people_count === 1 ? "משתתף אחד" : `${row.people_count} משתתפים`
          );
        }
      }

      const status = ENROLLMENT_STATUS[row.status] ?? {
        label: row.status,
        tone: "neutral" as const,
      };
      const payment = ENROLLMENT_PAYMENT_STATUS[row.payment_status] ?? {
        label: row.payment_status,
        tone: "neutral" as const,
      };
      const muted = row.status === "cancelled";

      rows.push({
        id: row.id,
        kind,
        title: row.is_trial
          ? `שיעור ניסיון · ${cls?.title ?? "חוג"}`
          : cls?.title ??
            program?.title ??
            pass?.title ??
            lesson?.title ??
            REGISTRATION_KIND_LABEL[kind],
        participant,
        detail: details.join(" · ") || null,
        statusLabel: status.label,
        statusTone: status.tone,
        paymentLabel:
          row.payment_status === "paid" && !muted ? null : payment.label,
        paymentTone:
          row.payment_status === "paid" && !muted ? null : payment.tone,
        muted,
      });
    } catch (error) {
      console.error("loadCustomerRegistrations row", row.id, error);
    }
  }

  for (const entry of waitlist ?? []) {
    const status = WAITLIST_STATUS[entry.status] ?? {
      label: entry.status,
      tone: "neutral" as const,
    };
    const child = asOne(entry.children);
    const cls = asOne(entry.classes);
    rows.push({
      id: `waitlist-${entry.id}`,
      kind: "waitlist",
      title: cls?.title ?? "חוג",
      participant: child?.full_name?.trim() || parentName,
      detail: null,
      statusLabel: status.label,
      statusTone: status.tone,
      paymentLabel: null,
      paymentTone: null,
      muted: false,
    });
  }

  const rank = (row: CustomerRegistration) => {
    if (row.muted) return 2;
    if (row.kind === "waitlist") return 1;
    return 0;
  };

  rows.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return (
      REGISTRATION_KIND_ORDER.indexOf(a.kind) -
      REGISTRATION_KIND_ORDER.indexOf(b.kind)
    );
  });

  return rows;
}
