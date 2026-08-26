import type { SupabaseClient } from "@supabase/supabase-js";
import { isAbandonedCardcomCharge, isDeferredPaymentMethod } from "@/lib/constants";
import type { Database, Enums } from "@/types/database.types";

export type SeatPayment = {
  status: Enums<"payment_status">;
  payment_method: Enums<"payment_method"> | null;
  external_reference?: string | null;
};

export type SeatEnrollment = {
  status: Enums<"enrollment_status">;
  payment_status?: Enums<"enrollment_payment_status"> | null;
  payments?: SeatPayment[] | null;
};

/**
 * האם ההרשמה תופסת מקום בחוג.
 * אשראי שנפתח לדף סליקה ולא שולם — לא תופס מקום.
 */
export function enrollmentHoldsSeat(enrollment: SeatEnrollment): boolean {
  if (enrollment.status !== "active" && enrollment.status !== "pending") {
    return false;
  }

  if (
    enrollment.payment_status === "paid" ||
    enrollment.payment_status === "partial" ||
    enrollment.payment_status === "not_required" ||
    enrollment.payment_status === "refunded"
  ) {
    return true;
  }

  return (enrollment.payments ?? []).some((payment) => {
    if (payment.status === "paid" || payment.status === "partial") return true;
    if (payment.status !== "pending") return false;
    if (isAbandonedCardcomCharge(payment.status, payment.payment_method, payment.external_reference)) {
      return false;
    }
    return (
      isDeferredPaymentMethod(payment.payment_method) ||
      payment.payment_method !== "credit_card"
    );
  });
}

const SEAT_SELECT =
  "id, status, payment_status, payments(status, payment_method, external_reference)";

export async function countHeldSeats(
  supabase: SupabaseClient<Database>,
  classId: string,
  weeklySlotId?: string | null
): Promise<number> {
  let query = supabase
    .from("enrollments")
    .select(SEAT_SELECT)
    .eq("class_id", classId)
    .in("status", ["active", "pending"]);

  if (weeklySlotId) {
    query = query.eq("weekly_slot_id", weeklySlotId);
  }

  const { data } = await query;
  return (data ?? []).filter((row) => enrollmentHoldsSeat(row)).length;
}
