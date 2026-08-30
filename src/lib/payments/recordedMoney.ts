import { isAbandonedCardcomCharge } from "@/lib/constants";
import type { Enums } from "@/types/database.types";

export type RecordedMoneyPayment = {
  id: string;
  status: Enums<"payment_status">;
  payment_method: Enums<"payment_method"> | null;
  external_reference: string | null;
  office_collection?: boolean | null;
  payment_receipts: { id: string }[] | null;
  payment_refunds: { id: string }[] | null;
  documentIds?: string[];
};

/** אין תקבול, חשבונית או סליקה — אפשר למחוק בלי לפגוע בתיעוד כספי. */
export function paymentHasRecordedMoney(payment: RecordedMoneyPayment): boolean {
  if ((payment.payment_receipts ?? []).length > 0) return true;
  if ((payment.payment_refunds ?? []).length > 0) return true;
  if ((payment.documentIds ?? []).length > 0) return true;
  if (payment.payment_method === "credit_card") {
    if (payment.external_reference?.trim()) return true;
    if (payment.status === "paid" || payment.status === "partial") return true;
    return !isAbandonedCardcomCharge(
      payment.status,
      payment.payment_method,
      payment.external_reference,
      payment.office_collection
    );
  }
  return false;
}
