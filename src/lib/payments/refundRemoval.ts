"use server";

import { requireRole } from "@/lib/auth";
import { cancelAdminEnrollment } from "@/lib/admin/enrollmentActions";
import { createAdminClient } from "@/lib/supabase/admin";

export type RefundRemovalOption = {
  enrollmentId: string;
  kindLabel: string;
  title: string;
  participant: string;
  /** הרשמה של החיוב הזה, או של תשלומים באותה עסקת סליקה. */
  onThisCharge: boolean;
};

const ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EnrollmentRow = {
  id: string;
  type: string;
  status: string;
  class_id: string | null;
  program_id: string | null;
  pool_pass_id: string | null;
  private_lesson_id: string | null;
  children: { full_name: string } | { full_name: string }[] | null;
  classes: { title: string } | { title: string }[] | null;
  programs:
    | { title: string; kind: string }
    | { title: string; kind: string }[]
    | null;
  pool_passes: { title: string } | { title: string }[] | null;
  private_lessons: { title: string } | { title: string }[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function describe(row: EnrollmentRow): Pick<RefundRemovalOption, "kindLabel" | "title" | "participant"> {
  const child = asOne(row.children)?.full_name?.trim();
  const participant = child || "עבור ההורה";
  if (row.type === "class") {
    return {
      kindLabel: "חוג",
      title: asOne(row.classes)?.title?.trim() || "חוג",
      participant,
    };
  }
  if (row.type === "pool_pass") {
    return {
      kindLabel: "כרטיסייה",
      title: asOne(row.pool_passes)?.title?.trim() || "כרטיסייה",
      participant,
    };
  }
  if (row.type === "private_lesson") {
    return {
      kindLabel: "שיעור פרטי",
      title: asOne(row.private_lessons)?.title?.trim() || "שיעור פרטי",
      participant,
    };
  }
  const program = asOne(row.programs);
  return {
    kindLabel: program?.kind === "membership" ? "מנוי" : "פעילות",
    title: program?.title?.trim() || (program?.kind === "membership" ? "מנוי" : "פעילות"),
    participant,
  };
}

const ENROLLMENT_SELECT =
  "id, type, status, class_id, program_id, pool_pass_id, private_lesson_id, children(full_name), classes(title), programs(title, kind), pool_passes(title), private_lessons(title)";

/** הרשמות פתוחות שאפשר להסיר אחרי זיכוי של החיוב. */
export async function loadRefundRemovalOptions(
  paymentId: string
): Promise<RefundRemovalOption[]> {
  await requireRole("admin");
  if (!ID.test(paymentId)) return [];

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, parent_id, enrollment_id, checkout_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return [];

  const onThisCharge = new Set<string>();
  if (payment.enrollment_id) onThisCharge.add(payment.enrollment_id);

  if (payment.checkout_id) {
    const { data: siblings } = await admin
      .from("payments")
      .select("enrollment_id")
      .eq("checkout_id", payment.checkout_id);
    for (const row of siblings ?? []) {
      if (row.enrollment_id) onThisCharge.add(row.enrollment_id);
    }
  }

  const ids = new Set(onThisCharge);
  if (payment.enrollment_id) {
    const { data: source } = await admin
      .from("enrollments")
      .select("class_id, program_id, pool_pass_id, private_lesson_id")
      .eq("id", payment.enrollment_id)
      .maybeSingle();

    const match = source?.class_id
      ? { column: "class_id" as const, value: source.class_id }
      : source?.program_id
        ? { column: "program_id" as const, value: source.program_id }
        : source?.pool_pass_id
          ? { column: "pool_pass_id" as const, value: source.pool_pass_id }
          : source?.private_lesson_id
            ? { column: "private_lesson_id" as const, value: source.private_lesson_id }
            : null;

    if (match) {
      const { data: related } = await admin
        .from("enrollments")
        .select("id")
        .eq("parent_id", payment.parent_id)
        .eq(match.column, match.value)
        .in("status", ["active", "pending"]);
      for (const row of related ?? []) ids.add(row.id);
    }
  }

  if (ids.size === 0) return [];

  const { data } = await admin
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .in("id", [...ids])
    .in("status", ["active", "pending"]);

  const options = ((data ?? []) as EnrollmentRow[]).map((row) => ({
    enrollmentId: row.id,
    ...describe(row),
    onThisCharge: onThisCharge.has(row.id),
  }));

  options.sort((a, b) => {
    if (a.onThisCharge !== b.onThisCharge) return a.onThisCharge ? -1 : 1;
    const title = a.title.localeCompare(b.title, "he");
    if (title !== 0) return title;
    return a.participant.localeCompare(b.participant, "he");
  });

  return options;
}

/** מבטל את ההרשמות שסומנו, בלי להפיק זיכוי נוסף. */
export async function removeRefundedEnrollments(
  enrollmentIds: string[]
): Promise<{ success: boolean; error?: string; warning?: string }> {
  await requireRole("admin");
  const unique = [...new Set(enrollmentIds)].filter((id) => ID.test(id));
  if (unique.length === 0) {
    return { success: false, error: "לא נבחרו הרשמות להסרה." };
  }
  if (unique.length > 30) {
    return { success: false, error: "אפשר להסיר עד 30 הרשמות בבת אחת." };
  }

  const warnings: string[] = [];
  for (const enrollmentId of unique) {
    const result = await cancelAdminEnrollment(enrollmentId);
    if (!result.success) return result;
    if (result.warning) warnings.push(result.warning);
  }

  return { success: true, warning: warnings[0] };
}
