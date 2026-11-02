"use server";

import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  isCollectibleOpenCharge,
  isReceiptlessChargeSettled,
  isStoreCreditPaymentMethod,
} from "@/lib/constants";
import { chargeDisplaySubject, subjectLabel } from "@/lib/finance/subject";
import { composeReceiptLine } from "@/lib/receipt-labels";
import type { Enums } from "@/types/database.types";

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

export type CustomerOpenBalance = {
  id: string;
  label: string;
  detail: string | null;
  remaining: number;
};

export type CustomerMoneyOverview = {
  documents: CustomerIssuedDocument[];
  balances: CustomerOpenBalance[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function byTime(a: { created_at: string }, b: { created_at: string }) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function documentKey(number: string | null, url: string | null) {
  if (number?.trim()) return `n:${number.trim()}`;
  if (url?.trim()) return `u:${url.trim()}`;
  return null;
}

export async function loadCustomerDocuments(
  parentId: string
): Promise<CustomerMoneyOverview> {
  const supabase = await createAdminDataClient();

  const [{ data: receipts }, { data: refunds }, { data: openCharges }] =
    await Promise.all([
    supabase
      .from("receipts")
      .select(
        "id, created_at, receipt_number, receipt_url, sent_to_email, payment_id, payments(amount, receipt_description, receipt_custom_text, payment_receipts(id, amount, created_at), enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)))"
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
    supabase
      .from("payments")
      .select(
        "id, amount, status, payment_method, external_reference, office_collection, receipt_description, receipt_custom_text, created_at, payment_receipts(amount), enrollments(type, status, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title))"
      )
      .eq("parent_id", parentId)
      .in("status", ["pending", "partial"]),
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
  const collectedByReceipt = collectedAmounts(receipts ?? []);
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
    const collected = collectedByReceipt.get(receipt.id);
    const product = composeReceiptLine({
      base: payment?.receipt_description,
      customText: payment?.receipt_custom_text,
      fallback: subjectLabel(payment?.enrollments ?? null),
    });

    documents.push({
      id: receipt.id,
      kind: matchedRefund ? "refund" : "invoice",
      title: matchedRefund ? "חשבונית זיכוי" : "חשבונית מס קבלה",
      number: receipt.receipt_number,
      url: receipt.receipt_url,
      amount: matchedRefund
        ? Number(matchedRefund.amount)
        : collected != null
          ? collected
          : payment && (payment.payment_receipts ?? []).length === 0
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

  return { documents, balances: openBalances(openCharges ?? []) };
}

function collectedAmounts(
  receipts: {
    id: string;
    created_at: string;
    payment_id: string | null;
    payments: {
      amount: number;
      payment_receipts: { id: string; amount: number; created_at: string }[] | null;
    } | null;
  }[]
) {
  const byPayment = new Map<string, typeof receipts>();
  for (const receipt of receipts) {
    if (!receipt.payment_id) continue;
    const group = byPayment.get(receipt.payment_id) ?? [];
    group.push(receipt);
    byPayment.set(receipt.payment_id, group);
  }

  const amounts = new Map<string, number>();
  for (const group of byPayment.values()) {
    const payment = group[0]?.payments;
    const collections = [...(payment?.payment_receipts ?? [])].sort(byTime);
    const docs = [...group].sort(byTime);
    docs.forEach((doc, index) => {
      const collection = collections[index];
      if (!collection) return;
      amounts.set(doc.id, round2(Number(collection.amount)));
    });
  }
  return amounts;
}

function childName(
  children: { full_name: string } | { full_name: string }[] | null
) {
  const child = Array.isArray(children) ? children[0] : children;
  const name = child?.full_name?.trim();
  return name || null;
}

function openBalances(
  charges: {
    id: string;
    amount: number;
    status: Enums<"payment_status">;
    payment_method: Enums<"payment_method"> | null;
    external_reference: string | null;
    office_collection: boolean;
    receipt_description: string | null;
    receipt_custom_text: string | null;
    created_at: string;
    payment_receipts: { amount: number }[] | null;
    enrollments: {
      type: Enums<"enrollment_type">;
      status: Enums<"enrollment_status">;
      children: { full_name: string } | { full_name: string }[] | null;
      classes: { title: string } | null;
      programs: { title: string } | null;
      pool_passes: { title: string } | null;
      private_lessons: { title: string } | null;
    } | null;
  }[]
): CustomerOpenBalance[] {
  return charges
    .filter((charge) => {
      if (isStoreCreditPaymentMethod(charge.payment_method)) return false;
      if (charge.enrollments?.status === "cancelled") return false;
      return isCollectibleOpenCharge(
        charge.status,
        charge.payment_method,
        charge.external_reference,
        charge.office_collection
      );
    })
    .map((charge) => {
      const paid = isReceiptlessChargeSettled(charge.payment_method, charge.status)
        ? Number(charge.amount)
        : (charge.payment_receipts ?? []).reduce(
            (sum, receipt) => sum + Number(receipt.amount),
            0
          );
      return {
        id: charge.id,
        label: chargeDisplaySubject({
          enrollment: charge.enrollments,
          receiptDescription: charge.receipt_description,
          receiptCustomText: charge.receipt_custom_text,
        }),
        detail: childName(charge.enrollments?.children ?? null),
        remaining: round2(Math.max(0, Number(charge.amount) - paid)),
        createdAt: charge.created_at,
      };
    })
    .filter((charge) => charge.remaining > 0.05)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map(({ createdAt: _createdAt, ...balance }) => balance);
}
