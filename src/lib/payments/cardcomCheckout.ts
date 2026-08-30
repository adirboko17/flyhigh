import { notifyAdminCardcomPaid } from "@/lib/notifications/adminPayment";
import { isAbandonedCardcomCharge } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";
import {
  cardcomChargeSucceeded,
  cardcomChargedAmount,
  cardcomDocumentNumber,
  cardcomDocumentUrl,
  cardcomTransactionId,
  createLowProfilePage,
  getLowProfileResult,
  type CardcomCustomer,
  type CardcomInstallments,
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

function remainingOfPayment(payment: {
  amount: number;
  payment_receipts?: { amount: number }[] | null;
}) {
  const paid = (payment.payment_receipts ?? []).reduce(
    (sum, receipt) => sum + Number(receipt.amount),
    0
  );
  return round2(Math.max(0, Number(payment.amount) - paid));
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
  installments?: CardcomInstallments | null;
  source?: "cart" | "collections" | null;
}): Promise<CardcomCheckoutResult> {
  const amount = round2(input.amount);
  const paymentIds = [...new Set(input.paymentIds.filter(Boolean))];

  if (amount <= 0 || paymentIds.length === 0) {
    return { success: false, error: "אין סכום לגבייה." };
  }

  const admin = createAdminClient();
  const { data: payments, error: paymentsError } = await admin
    .from("payments")
    .select("id, amount, status, parent_id, payment_receipts(amount)")
    .in("id", paymentIds);

  if (paymentsError || !payments || payments.length !== paymentIds.length) {
    return { success: false, error: "חלק מהחיובים לא נמצאו." };
  }

  if (payments.some((payment) => payment.parent_id !== input.parentId)) {
    return { success: false, error: "החיובים אינם שייכים ללקוח שנבחר." };
  }

  const open = payments.filter((payment) => remainingOfPayment(payment) > 0);
  if (open.length === 0) {
    return { success: false, error: "החיובים האלה כבר שולמו." };
  }

  const openAmount = round2(
    open.reduce((sum, payment) => sum + remainingOfPayment(payment), 0)
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
      installments: input.installments,
      source: input.source,
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

/** בודק מול קארדקום סשנים ממתינים — אם הסליקה עברה, מסמן את החיוב כשולם. */
export async function reconcilePendingCardcomCheckouts() {
  if (!process.env.CARDCOM_TERMINAL_NUMBER || !process.env.CARDCOM_API_NAME) {
    return;
  }

  const admin = createAdminClient();
  const { data: checkouts } = await admin
    .from("payment_checkouts")
    .select("id, low_profile_id")
    .eq("status", "pending")
    .not("low_profile_id", "is", null);

  await Promise.all(
    (checkouts ?? []).map((checkout) =>
      settleCardcomCheckout({
        checkoutId: checkout.id,
        lowProfileId: checkout.low_profile_id,
      }).catch(() => ({
        success: false as const,
        error: "reconcile failed",
      }))
    )
  );
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
  const documentUrl = cardcomDocumentUrl(result);
  const { data: payments } = await admin
    .from("payments")
    .select("id, amount, status, parent_id, enrollment_id, payment_receipts(amount)")
    .eq("checkout_id", checkout.id);

  const toSettle = (payments ?? [])
    .map((payment) => ({
      ...payment,
      remaining: remainingOfPayment(payment),
    }))
    .filter((payment) => payment.remaining > 0);

  if (toSettle.length > 0) {
    const { error: receiptError } = await admin.from("payment_receipts").insert(
      toSettle.map((payment) => ({
        payment_id: payment.id,
        amount: payment.remaining,
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
        toSettle.map((payment) => payment.id)
      );

    const receiptRows = toSettle.map((payment) => ({
      parent_id: payment.parent_id,
      payment_id: payment.id,
      receipt_number: documentNumber,
      receipt_url: documentUrl,
      sent_to_email: null,
    }));

    if (receiptRows.length > 0) {
      await admin.from("receipts").insert(receiptRows);
    }

    const enrollmentIds = [
      ...new Set(
        toSettle
          .map((payment) => payment.enrollment_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (enrollmentIds.length > 0) {
      const { data: enrollments } = await admin
        .from("enrollments")
        .select("class_id, child_id, parent_id")
        .in("id", enrollmentIds);

      for (const enrollment of enrollments ?? []) {
        if (!enrollment.class_id) continue;
        if (enrollment.child_id) {
          await admin
            .from("waitlist")
            .update({ status: "joined" })
            .eq("class_id", enrollment.class_id)
            .eq("child_id", enrollment.child_id)
            .in("status", ["waiting", "offered"]);
        } else {
          await admin
            .from("waitlist")
            .update({ status: "joined" })
            .eq("class_id", enrollment.class_id)
            .eq("parent_id", enrollment.parent_id)
            .is("child_id", null)
            .in("status", ["waiting", "offered"]);
        }
      }
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

/**
 * מבטל סשן אשראי שלא שולם — מוחק הרשמות וחיובים שנוצרו רק לצורך דף הסליקה.
 * אם קארדקום כבר חייב, מסמן כשולם ולא מוחק.
 */
export async function voidUnpaidCardcomCheckout(input: {
  checkoutId: string;
  parentId?: string;
}): Promise<{ voided: boolean; paid: boolean }> {
  const admin = createAdminClient();
  const checkoutId = input.checkoutId.trim();
  if (!checkoutId) return { voided: false, paid: false };

  let query = admin
    .from("payment_checkouts")
    .select("id, parent_id, status, low_profile_id, coupon_redemption_id")
    .eq("id", checkoutId);
  if (input.parentId) query = query.eq("parent_id", input.parentId);
  const { data: checkout } = await query.maybeSingle();

  if (!checkout) return { voided: false, paid: false };
  if (checkout.status === "paid") return { voided: false, paid: true };

  const settled = await settleCardcomCheckout({
    checkoutId: checkout.id,
    lowProfileId: checkout.low_profile_id,
  }).catch(() => null);

  if (
    settled?.success &&
    (settled.status === "paid" || settled.status === "already_paid")
  ) {
    return { voided: false, paid: true };
  }

  const { data: payments } = await admin
    .from("payments")
    .select(
      "id, enrollment_id, status, payment_method, external_reference, office_collection"
    )
    .eq("checkout_id", checkout.id);

  const rows = payments ?? [];
  if (rows.length === 0) {
    if (checkout.status === "pending") {
      await admin
        .from("payment_checkouts")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", checkout.id);
    }
    return { voided: true, paid: false };
  }

  if (
    rows.some(
      (payment) =>
        payment.status === "paid" ||
        Boolean(payment.external_reference) ||
        !isAbandonedCardcomCharge(
          payment.status,
          payment.payment_method,
          payment.external_reference,
          payment.office_collection
        )
    )
  ) {
    return { voided: false, paid: rows.some((payment) => payment.status === "paid") };
  }

  const paymentIds = rows.map((payment) => payment.id);
  const enrollmentIds = [
    ...new Set(
      rows
        .map((payment) => payment.enrollment_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (paymentIds.length) {
    await admin.from("payments").delete().in("id", paymentIds);
  }
  if (enrollmentIds.length) {
    await admin
      .from("private_lesson_slots")
      .delete()
      .in("enrollment_id", enrollmentIds);
    await admin
      .from("activity_bookings")
      .delete()
      .in("enrollment_id", enrollmentIds);
    await admin.from("enrollments").delete().in("id", enrollmentIds);
  }
  if (checkout.coupon_redemption_id) {
    await admin.rpc("release_coupon", {
      p_redemption_id: checkout.coupon_redemption_id,
    });
  }

  await admin
    .from("payment_checkouts")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", checkout.id);

  return { voided: true, paid: false };
}
