"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  REGISTRATION_KIND_LABEL,
  REGISTRATION_KIND_ORDER,
  type CustomerRegistration,
  type CustomerRegistrationKind,
} from "@/lib/admin/customerRegistrationTypes";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  WAITLIST_STATUS,
  DAYS_OF_WEEK,
} from "@/lib/constants";
import { formatDate, formatTime } from "@/utils/format";
import type { Enums } from "@/types/database.types";

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
  const supabase = await createAdminDataClient();

  const [{ data: enrollments }, { data: waitlist }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, type, status, payment_status, created_at, starts_on, ends_on, people_count, weekly_slot_id, children(full_name), classes(title, day_of_week, start_time, end_time, interest_only), programs(title, kind), pool_passes(title, entries_count), private_lessons(title, duration_minutes)"
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

  const slotIds = [
    ...new Set(
      (enrollments ?? [])
        .map((row) => row.weekly_slot_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const slotsById = new Map<
    string,
    { day_of_week: number; start_time: string; end_time: string }
  >();
  if (slotIds.length > 0) {
    const { data: slots } = await supabase
      .from("class_weekly_slots")
      .select("id, day_of_week, start_time, end_time")
      .in("id", slotIds);
    for (const slot of slots ?? []) {
      slotsById.set(slot.id, slot);
    }
  }

  const rows: CustomerRegistration[] = [];

  for (const row of enrollments ?? []) {
    const kind = registrationKind(row.type, row.programs?.kind);
    const participant = row.children?.full_name?.trim() || parentName;
    const slot = row.weekly_slot_id
      ? slotsById.get(row.weekly_slot_id)
      : undefined;
    const details: string[] = [];

    if (kind === "class") {
      const schedule =
        scheduleLabel(
          slot?.day_of_week ?? row.classes?.day_of_week,
          slot?.start_time ?? row.classes?.start_time,
          slot?.end_time ?? row.classes?.end_time
        ) ?? (row.classes?.interest_only ? "הרשמת עניין" : null);
      if (schedule) details.push(schedule);
    } else if (kind === "membership") {
      if (row.ends_on) details.push(`בתוקף עד ${formatDate(row.ends_on)}`);
      else if (row.starts_on) details.push(`מ-${formatDate(row.starts_on)}`);
    } else if (kind === "pool_pass") {
      const entries = row.pool_passes?.entries_count;
      if (entries != null) {
        details.push(entries === 1 ? "כניסה אחת" : `${entries} כניסות`);
      }
    } else if (kind === "private_lesson") {
      const duration = row.private_lessons?.duration_minutes;
      if (duration != null) details.push(`${duration} דק׳`);
    } else if (kind === "activity" && row.people_count != null) {
      details.push(
        row.people_count === 1 ? "משתתף אחד" : `${row.people_count} משתתפים`
      );
    }

    const status = ENROLLMENT_STATUS[row.status];
    const payment = ENROLLMENT_PAYMENT_STATUS[row.payment_status];
    const muted = row.status === "cancelled";

    rows.push({
      id: row.id,
      kind,
      title:
        row.classes?.title ??
        row.programs?.title ??
        row.pool_passes?.title ??
        row.private_lessons?.title ??
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
  }

  for (const entry of waitlist ?? []) {
    const status = WAITLIST_STATUS[entry.status];
    rows.push({
      id: `waitlist-${entry.id}`,
      kind: "waitlist",
      title: entry.classes?.title ?? "חוג",
      participant: entry.children?.full_name?.trim() || parentName,
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
