"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import { subjectLabel } from "@/lib/finance/subject";

export type CustomerIssuedDocument = {
  id: string;
  kind: "invoice" | "refund";
  title: string;
  number: string | null;
  url: string | null;
  amount: number | null;
  product: string | null;
  sentToEmail: string | null;
  createdAt: string;
};

function documentKey(number: string | null, url: string | null) {
  if (number?.trim()) return `n:${number.trim()}`;
  if (url?.trim()) return `u:${url.trim()}`;
  return null;
}

export async function loadCustomerDocuments(
  parentId: string
): Promise<CustomerIssuedDocument[]> {
  const supabase = await createAdminDataClient();

  const [{ data: receipts }, { data: refunds }] = await Promise.all([
    supabase
      .from("receipts")
      .select(
        "id, created_at, receipt_number, receipt_url, sent_to_email, payment_id, payments(amount, receipt_description, enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)))"
      )
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_refunds")
      .select(
        "id, amount, created_at, note, document_number, document_url, sent_to_email, payment_id"
      )
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false }),
  ]);

  const refundRows = refunds ?? [];
  const refundByKey = new Map<string, (typeof refundRows)[number]>();
  const refundByPayment = new Map<string, (typeof refundRows)[number][]>();
  for (const refund of refundRows) {
    const key = documentKey(refund.document_number, refund.document_url);
    if (key) refundByKey.set(key, refund);
    if (refund.payment_id) {
      const list = refundByPayment.get(refund.payment_id) ?? [];
      list.push(refund);
      refundByPayment.set(refund.payment_id, list);
    }
  }

  const usedRefundIds = new Set<string>();
  const documents: CustomerIssuedDocument[] = [];

  for (const receipt of receipts ?? []) {
    const key = documentKey(receipt.receipt_number, receipt.receipt_url);
    const matchedRefund =
      (key ? refundByKey.get(key) : undefined) ??
      (receipt.payment_id
        ? refundByPayment.get(receipt.payment_id)?.find(
            (refund) =>
              !refund.document_number &&
              !refund.document_url &&
              Math.abs(
                new Date(refund.created_at).getTime() -
                  new Date(receipt.created_at).getTime()
              ) < 60_000
          )
        : undefined);

    if (matchedRefund) usedRefundIds.add(matchedRefund.id);

    const payment = receipt.payments;
    const product =
      payment?.receipt_description?.trim() ||
      subjectLabel(payment?.enrollments ?? null);

    documents.push({
      id: receipt.id,
      kind: matchedRefund ? "refund" : "invoice",
      title: matchedRefund ? "חשבונית זיכוי" : "חשבונית מס קבלה",
      number: receipt.receipt_number,
      url: receipt.receipt_url,
      amount: matchedRefund
        ? Number(matchedRefund.amount)
        : payment
          ? Number(payment.amount)
          : null,
      product: product === "חיוב כללי" ? null : product,
      sentToEmail: receipt.sent_to_email,
      createdAt: receipt.created_at,
    });
  }

  for (const refund of refundRows) {
    if (usedRefundIds.has(refund.id)) continue;
    documents.push({
      id: `refund-${refund.id}`,
      kind: "refund",
      title: "חשבונית זיכוי",
      number: refund.document_number,
      url: refund.document_url,
      amount: Number(refund.amount),
      product: refund.note,
      sentToEmail: refund.sent_to_email,
      createdAt: refund.created_at,
    });
  }

  documents.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return documents;
}
