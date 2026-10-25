import { createAdminDataClient } from "@/lib/admin/dataClient";
import { isAbandonedCardcomEnrollment } from "@/lib/enrollment/holdsSeat";
import type { Enums } from "@/types/database.types";
import { formatDate } from "@/utils/format";

export type PlanBuyerKind = "pool_pass" | "membership";

export type PlanBuyerRow = {
  id: string;
  kind: PlanBuyerKind;
  parentId: string;
  parentName: string;
  phone: string | null;
  participant: string;
  title: string;
  detail: string | null;
  createdAt: string;
  paymentStatus: Enums<"enrollment_payment_status">;
  enrollmentStatus: Enums<"enrollment_status">;
  incomeClassId: string | null;
  incomeClassMixed: boolean;
  canAssign: boolean;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadPlanBuyers(): Promise<PlanBuyerRow[]> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("enrollments")
    .select(
      "id, type, status, payment_status, created_at, people_count, ends_on, parent_id, profiles(full_name, phone), children(full_name), pool_passes(title, entries_count), programs(title, kind), payments(id, income_class_id, status, payment_method, external_reference, office_collection)"
    )
    .in("type", ["pool_pass", "program"])
    .order("created_at", { ascending: false });

  const rows: PlanBuyerRow[] = [];

  for (const row of data ?? []) {
    const program = asOne(row.programs);
    const kind: PlanBuyerKind | null =
      row.type === "pool_pass"
        ? "pool_pass"
        : program?.kind === "membership"
          ? "membership"
          : null;
    if (!kind) continue;

    const payments = row.payments ?? [];
    if (
      isAbandonedCardcomEnrollment({
        status: row.status,
        payment_status: row.payment_status,
        payments,
      })
    ) {
      continue;
    }

    const classIds = payments.map((payment) => payment.income_class_id);
    const unique = new Set(classIds);
    const pass = asOne(row.pool_passes);
    const child = asOne(row.children);
    const profile = asOne(row.profiles);
    const entries = row.people_count ?? pass?.entries_count ?? null;

    rows.push({
      id: row.id,
      kind,
      parentId: row.parent_id,
      parentName: profile?.full_name?.trim() || "לקוח לא ידוע",
      phone: profile?.phone ?? null,
      participant: child?.full_name?.trim() || "עבור ההורה",
      title:
        (kind === "pool_pass" ? pass?.title : program?.title)?.trim() ||
        (kind === "pool_pass" ? "כרטיסייה" : "מנוי"),
      detail:
        kind === "pool_pass"
          ? entries == null
            ? null
            : entries === 1
              ? "כניסה אחת"
              : `${entries} כניסות`
          : row.ends_on
            ? `בתוקף עד ${formatDate(row.ends_on)}`
            : null,
      createdAt: row.created_at,
      paymentStatus: row.payment_status,
      enrollmentStatus: row.status,
      incomeClassId: unique.size === 1 ? (classIds[0] ?? null) : null,
      incomeClassMixed: unique.size > 1,
      canAssign: payments.length > 0,
    });
  }

  return rows;
}
