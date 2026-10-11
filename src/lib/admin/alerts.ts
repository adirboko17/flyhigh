import { customerCardHref, type AdminAlert } from "@/lib/admin/alertTypes";
import {
  ABSENCE_FRESH_DAYS,
  collectionAgeLabel,
  collectionUrgency,
  MEMBERSHIP_EXPIRED_LOOKBACK_DAYS,
  trailingAbsentDates,
} from "@/lib/admin/alertRules";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { requireRole } from "@/lib/auth";
import {
  isCollectibleOpenCharge,
  isCollectionPaymentMethod,
  PAYMENT_METHOD,
} from "@/lib/constants";
import { chargeDisplaySubject } from "@/lib/finance/subject";
import {
  daysUntilMembershipEnds,
  MEMBERSHIP_EXPIRY_WARNING_DAYS,
  membershipExpiryLabel,
  membershipExpiryStatus,
} from "@/lib/memberships";
import { participantDisplayName } from "@/lib/enrollment/participant";
import { addDays, israelDateOf, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { formatCurrency, formatDate } from "@/utils/format";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function daysSince(date: string, today: string) {
  return daysUntilMembershipEnds(today, date);
}

export async function loadAdminAlerts(): Promise<AdminAlert[]> {
  const profile = await requireRole("admin");
  const supabase = await createAdminDataClient();
  const today = todayInIsrael();
  const attendanceSince = addDays(today, -120);

  const [chargesResult, membershipsResult, attendanceResult, enrollmentsResult, seenResult] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "id, amount, status, payment_method, office_collection, external_reference, created_at, parent_id, receipt_description, receipt_custom_text, profiles(full_name, phone), enrollments(type, status, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(amount)"
        )
        .in("status", ["pending", "partial"]),
      supabase
        .from("enrollments")
        .select(
          "id, ends_on, parent_id, programs(title), children(full_name), profiles(full_name, phone)"
        )
        .eq("type", "program")
        .eq("status", "active")
        .not("ends_on", "is", null)
        .gte("ends_on", addDays(today, -MEMBERSHIP_EXPIRED_LOOKBACK_DAYS))
        .lte("ends_on", addDays(today, MEMBERSHIP_EXPIRY_WARNING_DAYS))
        .order("ends_on"),
      supabase
        .from("attendance")
        .select(
          "class_id, date, status, child_id, parent_id, children(full_name), profiles(full_name, phone), classes(title)"
        )
        .gte("date", attendanceSince)
        .order("date", { ascending: true })
        .limit(2000),
      supabase
        .from("enrollments")
        .select("class_id, child_id, parent_id")
        .eq("type", "class")
        .eq("status", "active")
        .not("class_id", "is", null)
        .limit(2000),
      supabase
        .from("admin_alert_reads")
        .select("alert_key")
        .eq("admin_id", profile.id),
    ]);

  if (chargesResult.error) {
    console.error("[admin-alerts] collections", chargesResult.error);
  }
  if (membershipsResult.error) {
    console.error("[admin-alerts] memberships", membershipsResult.error);
  }
  if (attendanceResult.error) {
    console.error("[admin-alerts] attendance", attendanceResult.error);
  }
  if (enrollmentsResult.error) {
    console.error("[admin-alerts] enrollments", enrollmentsResult.error);
  }
  if (seenResult.error) {
    console.error("[admin-alerts] reads", seenResult.error);
  }

  const seen = new Set((seenResult.data ?? []).map((row) => row.alert_key));
  const collections: AdminAlert[] = [];
  const collectionAge = new Map<string, number>();

  for (const charge of chargesResult.data ?? []) {
    if (!isCollectionPaymentMethod(charge.payment_method)) continue;
    if (
      charge.payment_method === "credit_card" &&
      charge.office_collection !== true
    ) {
      continue;
    }
    if (
      !isCollectibleOpenCharge(
        charge.status,
        charge.payment_method,
        charge.external_reference,
        charge.office_collection
      )
    ) {
      continue;
    }

    const amount = Number(charge.amount);
    const paid = (charge.payment_receipts ?? []).reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0
    );
    const remaining = round2(Math.max(0, amount - paid));
    if (remaining <= 0) continue;

    const parent = one(charge.profiles);
    const enrollment = one(charge.enrollments);
    const childName = one(enrollment?.children)?.full_name ?? null;
    const openedOn = israelDateOf(charge.created_at);
    const ageDays = daysSince(openedOn, today);
    const urgency = collectionUrgency(ageDays);
    const key = `collection:${charge.id}`;
    collectionAge.set(key, ageDays);
    const subject = chargeDisplaySubject({
      enrollment,
      receiptDescription: charge.receipt_description,
      receiptCustomText: charge.receipt_custom_text,
    });
    const method = PAYMENT_METHOD[charge.payment_method];

    collections.push({
      key,
      kind: "collection",
      tone:
        urgency === "overdue"
          ? "danger"
          : urgency === "waiting"
            ? "warning"
            : "info",
      title: parent?.full_name?.trim() || "לקוח",
      detail: [childName, subject, method, enrollment?.status === "cancelled" ? "ההרשמה בוטלה" : null]
        .filter(Boolean)
        .join(" · "),
      meta: `${collectionAgeLabel(ageDays)} · ${formatDate(openedOn)}`,
      statusLabel:
        urgency === "overdue"
          ? "באיחור"
          : urgency === "waiting"
            ? "ממתין"
            : "חדש בגבייה",
      href: "/admin/collections",
      customerHref: customerCardHref(charge.parent_id),
      phone: parent?.phone ?? null,
      amountLabel: formatCurrency(remaining),
      unseen: !seen.has(key),
    });
  }

  const toneRank = { danger: 0, warning: 1, info: 2 };
  collections.sort(
    (a, b) =>
      toneRank[a.tone] - toneRank[b.tone] ||
      (collectionAge.get(b.key) ?? 0) - (collectionAge.get(a.key) ?? 0)
  );

  const memberships: AdminAlert[] = [];
  for (const row of membershipsResult.data ?? []) {
    if (!row.ends_on) continue;
    const parent = one(row.profiles);
    const childName = one(row.children)?.full_name ?? null;
    const status = membershipExpiryStatus(row.ends_on, today);
    const days = daysUntilMembershipEnds(row.ends_on, today);
    const key = `membership:${row.id}:${row.ends_on}:${status}`;
    memberships.push({
      key,
      kind: "membership",
      tone: status === "expired" || days <= 3 ? "danger" : "warning",
      title: participantDisplayName(childName, parent?.full_name, "לקוח"),
      detail: [
        one(row.programs)?.title ?? "מנוי",
        childName ? parent?.full_name : null,
      ]
        .filter(Boolean)
        .join(" · "),
      meta: `עד ${formatDate(row.ends_on)}`,
      statusLabel: membershipExpiryLabel(row.ends_on, today),
      href: customerCardHref(row.parent_id),
      customerHref: null,
      phone: parent?.phone ?? null,
      amountLabel: null,
      unseen: !seen.has(key),
    });
  }

  const activeClass = new Map<string, string>();
  for (const row of enrollmentsResult.data ?? []) {
    if (!row.class_id) continue;
    const personKey = row.child_id
      ? `${row.class_id}:c:${row.child_id}`
      : `${row.class_id}:p:${row.parent_id}`;
    activeClass.set(personKey, row.parent_id);
  }

  type AbsenceBucket = {
    classTitle: string;
    childName: string | null;
    parentName: string | null;
    phone: string | null;
    parentId: string | null;
    marks: { date: string; status: string }[];
  };
  const buckets = new Map<string, AbsenceBucket>();

  for (const row of attendanceResult.data ?? []) {
    if (!row.class_id || !row.date || !row.status) continue;
    const personKey = row.child_id
      ? `${row.class_id}:c:${row.child_id}`
      : row.parent_id
        ? `${row.class_id}:p:${row.parent_id}`
        : null;
    if (!personKey) continue;

    const child = one(row.children);
    const parent = one(row.profiles);
    const klass = one(row.classes);
    const bucket = buckets.get(personKey) ?? {
      classTitle: klass?.title ?? "חוג",
      childName: child?.full_name ?? null,
      parentName: parent?.full_name ?? null,
      phone: parent?.phone ?? null,
      parentId: row.parent_id,
      marks: [],
    };
    if (klass?.title) bucket.classTitle = klass.title;
    if (child?.full_name) bucket.childName = child.full_name;
    if (parent?.full_name) bucket.parentName = parent.full_name;
    if (parent?.phone) bucket.phone = parent.phone;
    if (row.parent_id) bucket.parentId = row.parent_id;
    bucket.marks.push({ date: row.date, status: row.status });
    buckets.set(personKey, bucket);
  }

  const freshSince = addDays(today, -ABSENCE_FRESH_DAYS);
  const absences: Array<AdminAlert & { latest: string }> = [];

  for (const [personKey, bucket] of buckets) {
    const parentId = bucket.parentId ?? activeClass.get(personKey) ?? null;
    if (!activeClass.has(personKey)) continue;

    const streak = trailingAbsentDates(bucket.marks);
    if (streak.length < 2) continue;
    const latest = streak[streak.length - 1];
    const started = streak[0];
    if (!latest || !started || latest < freshSince) continue;

    const previous = streak[streak.length - 2];
    const key = `absence:${personKey}:${started}`;
    absences.push({
      latest,
      key,
      kind: "absence",
      tone: "danger",
      title: participantDisplayName(
        bucket.childName,
        bucket.parentName,
        "לקוח"
      ),
      detail: [
        bucket.classTitle,
        bucket.childName ? bucket.parentName : null,
      ]
        .filter(Boolean)
        .join(" · "),
      meta:
        previous && previous !== latest
          ? `${formatDate(previous)} ו-${formatDate(latest)}`
          : formatDate(latest),
      statusLabel:
        streak.length === 2
          ? "נעדר פעמיים ברציפות"
          : `נעדר ${streak.length} פעמים ברציפות`,
      href: customerCardHref(parentId),
      customerHref: null,
      phone: bucket.phone,
      amountLabel: null,
      unseen: !seen.has(key),
    });
  }

  absences.sort(
    (a, b) => b.latest.localeCompare(a.latest) || a.title.localeCompare(b.title, "he")
  );

  return [
    ...collections,
    ...memberships,
    ...absences.map(({ latest: _latest, ...alert }) => alert),
  ];
}

export async function unreadAlertCount() {
  const alerts = await loadAdminAlerts();
  return alerts.filter((alert) => alert.unseen).length;
}
