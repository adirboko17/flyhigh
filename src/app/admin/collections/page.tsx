import {
  CollectionsList,
  type CollectionCharge,
  type CollectionParent,
} from "@/components/admin/CollectionsList";
import { DEFERRED_PAYMENT_METHODS, isDeferredPaymentMethod } from "@/lib/constants";
import { subjectKind, subjectLabel } from "@/lib/finance/subject";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "גבייה" };

export default async function AdminCollectionsPage() {
  const supabase = await createClient();

  const { data: charges } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, status, paid_at, created_at, parent_id, profiles(full_name, phone, email), enrollments(id, type, status, children(full_name), classes(title), programs(title), pool_passes(title))"
    )
    .in("payment_method", [...DEFERRED_PAYMENT_METHODS])
    .order("created_at", { ascending: false });

  const byParent = new Map<string, CollectionParent>();

  for (const charge of charges ?? []) {
    if (!isDeferredPaymentMethod(charge.payment_method)) continue;

    const enrollment = charge.enrollments;
    const amount = Number(charge.amount);
    const isOpen = charge.status === "pending";

    const entry: CollectionCharge = {
      id: charge.id,
      amount,
      method: charge.payment_method,
      status: charge.status,
      paidAt: charge.paid_at,
      createdAt: charge.created_at,
      childName: enrollment?.children?.full_name ?? null,
      subject: subjectLabel(enrollment),
      subjectType: subjectKind(enrollment),
      enrollmentCancelled: enrollment?.status === "cancelled",
    };

    const existing = byParent.get(charge.parent_id);
    if (existing) {
      existing.charges.push(entry);
      existing.openAmount += isOpen ? amount : 0;
      existing.paidAmount += isOpen ? 0 : amount;
    } else {
      byParent.set(charge.parent_id, {
        id: charge.parent_id,
        name: charge.profiles?.full_name ?? "לקוח לא ידוע",
        phone: charge.profiles?.phone ?? null,
        email: charge.profiles?.email ?? null,
        charges: [entry],
        openAmount: isOpen ? amount : 0,
        paidAmount: isOpen ? 0 : amount,
      });
    }
  }

  // חייבים קודם, לפי גובה החוב; אחריהם מי שכבר סגר חשבון.
  const parents = [...byParent.values()].sort(
    (a, b) => b.openAmount - a.openAmount || a.name.localeCompare(b.name, "he")
  );

  return <CollectionsList parents={parents} />;
}
