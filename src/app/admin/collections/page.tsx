import {
  CollectionsList,
  type CollectionCharge,
  type CollectionParent,
  type CollectionReceipt,
} from "@/components/admin/CollectionsList";
import {
  COLLECTION_OFFICE_METHODS,
  isCollectionPaymentMethod,
  isPoolPassPaymentMethod,
} from "@/lib/constants";
import { subjectKind, subjectLabel } from "@/lib/finance/subject";
import type { ReceiptLabelOption } from "@/lib/receipt-labels";
import { addDays, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createAdminDataClient } from "@/lib/admin/dataClient";

export const metadata = { title: "גבייה" };

/** כמה ימים אחורה לטעון חיובים שכבר שולמו (ללשונית "שולמו"). */
const PAID_LOOKBACK_DAYS = 120;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default async function AdminCollectionsPage() {
  const supabase = await createAdminDataClient();
  const paidSince = `${addDays(todayInIsrael(), -PAID_LOOKBACK_DAYS)}T00:00:00`;

  // חובות פתוחים/חלקיים תמיד + שולמו לאחרונה בלבד (בלי לגרור את כל ההיסטוריה).
  const [{ data: charges }, { data: labelRows }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, payment_method, office_collection, status, paid_at, created_at, parent_id, receipt_label_id, receipt_description, receipt_custom_text, receipt_labels(id, label), profiles(full_name, phone, email, customer_admin_notes(body)), enrollments(id, type, status, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(id, amount, received_at, note)"
      )
      .or(
        `payment_method.in.(${COLLECTION_OFFICE_METHODS.join(",")}),and(payment_method.eq.credit_card,office_collection.eq.true)`
      )
      .or(
        `status.in.(pending,partial),and(status.eq.paid,paid_at.gte.${paidSince})`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("receipt_labels")
      .select("id, label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
  ]);

  const receiptLabels: ReceiptLabelOption[] = labelRows ?? [];

  const byParent = new Map<string, CollectionParent>();

  for (const charge of charges ?? []) {
    if (!isCollectionPaymentMethod(charge.payment_method)) continue;
    if (
      charge.payment_method === "credit_card" &&
      charge.office_collection !== true
    ) {
      continue;
    }

    const enrollment = charge.enrollments;
    const amount = Number(charge.amount);
    const receipts: CollectionReceipt[] = [...(charge.payment_receipts ?? [])]
      .map((receipt) => ({
        id: receipt.id,
        amount: Number(receipt.amount),
        receivedAt: receipt.received_at,
        note: receipt.note,
      }))
      .sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );

    const passSettled =
      isPoolPassPaymentMethod(charge.payment_method) &&
      charge.status === "paid";
    const amountPaid = passSettled
      ? amount
      : round2(receipts.reduce((sum, receipt) => sum + receipt.amount, 0));
    const remaining = passSettled
      ? 0
      : round2(Math.max(0, amount - amountPaid));
    const receiptLabelRow = charge.receipt_labels;
    const receiptLabel =
      (receiptLabelRow && !Array.isArray(receiptLabelRow)
        ? receiptLabelRow.label
        : Array.isArray(receiptLabelRow)
          ? receiptLabelRow[0]?.label
          : null) ??
      (charge.receipt_label_id
        ? charge.receipt_description?.trim() || null
        : null);

    const entry: CollectionCharge = {
      id: charge.id,
      amount,
      amountPaid,
      remaining,
      method: charge.payment_method,
      status: charge.status,
      paidAt: charge.paid_at,
      createdAt: charge.created_at,
      childName: enrollment?.children?.full_name ?? null,
      subject: subjectLabel(enrollment),
      subjectType: subjectKind(enrollment),
      enrollmentCancelled: enrollment?.status === "cancelled",
      receiptLabelId: charge.receipt_label_id,
      receiptLabel,
      receiptDescription: charge.receipt_description?.trim() || null,
      receiptCustomText: charge.receipt_custom_text?.trim() || null,
      receipts,
    };

    const existing = byParent.get(charge.parent_id);
    if (existing) {
      existing.charges.push(entry);
      existing.openAmount = round2(existing.openAmount + remaining);
      existing.paidAmount = round2(existing.paidAmount + amountPaid);
    } else {
      byParent.set(charge.parent_id, {
        id: charge.parent_id,
        name: charge.profiles?.full_name ?? "לקוח לא ידוע",
        phone: charge.profiles?.phone ?? null,
        email: charge.profiles?.email ?? null,
        adminNote: (() => {
          const note = charge.profiles?.customer_admin_notes;
          const row = Array.isArray(note) ? note[0] : note;
          return row?.body?.trim() || null;
        })(),
        charges: [entry],
        openAmount: remaining,
        paidAmount: amountPaid,
      });
    }
  }

  // חייבים קודם, לפי גובה החוב; אחריהם מי שכבר סגר חשבון.
  const parents = [...byParent.values()].sort(
    (a, b) => b.openAmount - a.openAmount || a.name.localeCompare(b.name, "he")
  );

  return <CollectionsList parents={parents} receiptLabels={receiptLabels} />;
}
