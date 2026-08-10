import {
  CollectionsList,
  type CollectionCharge,
  type CollectionParent,
  type CollectionReceipt,
} from "@/components/admin/CollectionsList";
import { DEFERRED_PAYMENT_METHODS, isDeferredPaymentMethod } from "@/lib/constants";
import { subjectKind, subjectLabel } from "@/lib/finance/subject";
import { addDays, todayInIsrael } from "@/lib/scheduling/monthGrid";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "גבייה" };

/** כמה ימים אחורה לטעון חיובים שכבר שולמו (ללשונית "שולמו"). */
const PAID_LOOKBACK_DAYS = 120;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default async function AdminCollectionsPage() {
  const supabase = await createClient();
  const paidSince = `${addDays(todayInIsrael(), -PAID_LOOKBACK_DAYS)}T00:00:00`;

  // חובות פתוחים/חלקיים תמיד + שולמו לאחרונה בלבד (בלי לגרור את כל ההיסטוריה).
  const { data: charges } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, status, paid_at, created_at, parent_id, profiles(full_name, phone, email), enrollments(id, type, status, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_receipts(id, amount, received_at, note)"
    )
    .in("payment_method", [...DEFERRED_PAYMENT_METHODS])
    .or(
      `status.in.(pending,partial),and(status.eq.paid,paid_at.gte.${paidSince})`
    )
    .order("created_at", { ascending: false });

  const byParent = new Map<string, CollectionParent>();

  for (const charge of charges ?? []) {
    if (!isDeferredPaymentMethod(charge.payment_method)) continue;

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

    const amountPaid = round2(
      receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
    );
    const remaining = round2(Math.max(0, amount - amountPaid));

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

  return <CollectionsList parents={parents} />;
}
