import { notifyAdminCardcomPaid } from "@/lib/notifications/adminPayment";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";
import {
  cardcomChargeSucceeded,
  cardcomChargedAmount,
  cardcomDocumentNumber,
  cardcomTransactionId,
  createLowProfilePage,
  getLowProfileResult,
  type CardcomCustomer,
} from "@/lib/integrations/cardcom";

export type CardcomCheckoutResult =
  | { success: true; checkoutId: string; checkoutUrl: string; reference: string }
  | { success: false; error: string };

export type CardcomSettleResult =
  | { success: true; status: "paid" | "already_paid"; transactionId: string | null }
  | { success: true; status: "failed" | "pending"; error?: string }
  | { success: false; error: string };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function loadCustomer(parentId: string): Promise<CardcomCustomer> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("full_name, email, phone, address, city, receipt_name, receipt_id_number")
    .eq("id", parentId)
    .maybeSingle();

  const fullName = data?.full_name?.trim() || "לקוח";
  const invoiceName = data?.receipt_name?.trim() || fullName;

  return {
    name: fullName,
    invoiceName,
    email: data?.email,
    phone: data?.phone,
    taxId: data?.receipt_id_number,
    address: data?.address,
    city: data?.city,
  };
}

export async function startCardcomCheckout(input: {
  parentId: string;
  paymentIds: string[];
  amount: number;
  description: string;
  couponRedemptionId?: string | null;
}): Promise<CardcomCheckoutResult> {
  const amount = round2(input.amount);
  const paymentIds = [...new Set(input.paymentIds.filter(Boolean))];

  if (amount <= 0 || paymentIds.length === 0) {
    return { success: false, error: "אין סכום לגבייה." };
  }

  const admin = createAdminClient();
  const { data: payments, error: paymentsError } = await admin
    .from("payments")
    .select("id, amount, status, parent_id")
    .in("id", paymentIds);

  if (paymentsError || !payments || payments.length !== paymentIds.length) {
    return { success: false, error: "חלק מהחיובים לא נמצאו." };
  }

  if (payments.some((payment) => payment.parent_id !== input.parentId)) {
    return { success: false, error: "החיובים אינם שייכים ללקוח שנבחר." };
  }

  const open = payments.filter((payment) => payment.status === "pending");
  if (open.length === 0) {
    return { success: false, error: "החיובים האלה כבר שולמו." };
  }

  const openAmount = round2(
    open.reduce((sum, payment) => sum + Number(payment.amount), 0)
  );
  if (Math.abs(openAmount - amount) > 0.05) {
    return { success: false, error: "סכום החיוב אינו תואם את התשלומים הפתוחים." };
  }

  const { data: checkout, error: checkoutError } = await admin
    .from("payment_checkouts")
    .insert({
      parent_id: input.parentId,
      amount,
      description: input.description,
      status: "pending",
      coupon_redemption_id: input.couponRedemptionId ?? null,
    })
    .select("id")
    .single();

  if (checkoutError || !checkout) {
    return { success: false, error: "לא הצלחנו לפתוח סשן תשלום." };
  }

  try {
    const page = await createLowProfilePage({
      checkoutId: checkout.id,
      amount,
      description: input.description,
      customer: await loadCustomer(input.parentId),
    });

    const { error: updateError } = await admin
      .from("payment_checkouts")
      .update({
        low_profile_id: page.lowProfileId,
        payment_url: page.url,
      })
      .eq("id", checkout.id);

    if (updateError) {
      throw new Error("שמירת פרטי הסליקה נכשלה.");
    }

    const { error: linkError } = await admin
      .from("payments")
      .update({ checkout_id: checkout.id })
      .in(
        "id",
        open.map((payment) => payment.id)
      );

    if (linkError) {
      throw new Error("קישור החיובים לדף התשלום נכשל.");
    }

    return {
      success: true,
      checkoutId: checkout.id,
      checkoutUrl: page.url,
      reference: page.lowProfileId,
    };
  } catch (error) {
    await admin
      .from("payment_checkouts")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", checkout.id);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "לא הצלחנו לפתוח את דף התשלום. נסו שוב.",
    };
  }
}

export async function settleCardcomCheckout(input: {
  checkoutId?: string | null;
  lowProfileId?: string | null;
  /** בדף כישלון / webhook של דחייה — מסמנים את הסשן כנכשל. בדף הצלחה משאירים ממתין אם עדיין אין אישור. */
  markFailedIfUnpaid?: boolean;
}): Promise<CardcomSettleResult> {
  const admin = createAdminClient();
  const checkoutId = input.checkoutId?.trim() || null;
  const lowProfileId = input.lowProfileId?.trim() || null;

  if (!checkoutId && !lowProfileId) {
    return { success: false, error: "חסר מזהה עסקה." };
  }

  let query = admin.from("payment_checkouts").select("*");
  query = checkoutId
    ? query.eq("id", checkoutId)
    : query.eq("low_profile_id", lowProfileId!);

  const { data: checkout } = await query.maybeSingle();

  if (!checkout) {
    return { success: false, error: "סשן התשלום לא נמצא." };
  }

  if (checkout.status === "paid") {
    return {
      success: true,
      status: "already_paid",
      transactionId: checkout.transaction_id,
    };
  }

  const profileId = checkout.low_profile_id ?? lowProfileId;
  if (!profileId) {
    return { success: true, status: "pending" };
  }

  const result = await getLowProfileResult(profileId);

  if (!cardcomChargeSucceeded(result)) {
    if (input.markFailedIfUnpaid && checkout.status === "pending") {
      await admin
        .from("payment_checkouts")
        .update({
          status: "failed",
          raw_result: result as Json,
          completed_at: new Date().toISOString(),
        })
        .eq("id", checkout.id);
    }

    return {
      success: true,
      status: input.markFailedIfUnpaid ? "failed" : "pending",
      error: result.Description || "התשלום לא אושר.",
    };
  }

  const charged = cardcomChargedAmount(result);
  if (charged !== null && Math.abs(charged - Number(checkout.amount)) > 0.05) {
    return { success: false, error: "סכום החיוב שחזר מקארדקום אינו תואם." };
  }

  const transactionId = cardcomTransactionId(result);
  const documentNumber = cardcomDocumentNumber(result);
  const { data: payments } = await admin
    .from("payments")
    .select("id, amount, status, parent_id, enrollment_id")
    .eq("checkout_id", checkout.id);

  const pending = (payments ?? []).filter((payment) => payment.status === "pending");

  if (pending.length > 0) {
    const { error: receiptError } = await admin.from("payment_receipts").insert(
      pending.map((payment) => ({
        payment_id: payment.id,
        amount: Number(payment.amount),
        note: "סליקת קארדקום",
      }))
    );

    if (receiptError) {
      return { success: false, error: "התשלום אושר אך עדכון החיובים נכשל." };
    }

    await admin
      .from("payments")
      .update({
        external_reference: transactionId,
        payment_method: "credit_card",
      })
      .in(
        "id",
        pending.map((payment) => payment.id)
      );

    const receiptRows = pending.map((payment) => ({
      parent_id: payment.parent_id,
      payment_id: payment.id,
      receipt_number: documentNumber,
      sent_to_email: null,
    }));

    if (receiptRows.length > 0) {
      await admin.from("receipts").insert(receiptRows);
    }
  }

  await admin
    .from("payment_checkouts")
    .update({
      status: "paid",
      transaction_id: transactionId,
      document_number: documentNumber,
      raw_result: result as Json,
      completed_at: new Date().toISOString(),
    })
    .eq("id", checkout.id);

  await notifyAdminCardcomPaid({
    parentId: checkout.parent_id,
    amount: Number(checkout.amount),
    description: checkout.description,
    paymentIds: (payments ?? []).map((payment) => payment.id),
  });

  return { success: true, status: "paid", transactionId };
}
