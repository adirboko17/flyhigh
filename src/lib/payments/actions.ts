"use server";

import { requireRole } from "@/lib/auth";
import { startCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import { createClient } from "@/lib/supabase/server";

export type PayOpenChargeResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

/**
 * פותח דף סליקה לקארדקום עבור חיוב אשראי פתוח.
 * אם החיוב שייך לאותו סשן כמו אחים באותה הזמנה — כולם נגבים יחד.
 */
export async function payOpenCreditCharge(
  paymentId: string
): Promise<PayOpenChargeResult> {
  const profile = await requireRole("parent");
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount, status, payment_method, checkout_id, receipt_description")
    .eq("id", paymentId)
    .eq("parent_id", profile.id)
    .maybeSingle();

  if (!payment || payment.status !== "pending") {
    return { success: false, error: "החיוב לא נמצא או שכבר שולם." };
  }

  if (payment.payment_method !== "credit_card") {
    return { success: false, error: "חיוב זה אינו משולם בכרטיס אשראי." };
  }

  let related = [payment];
  if (payment.checkout_id) {
    const { data: group } = await supabase
      .from("payments")
      .select("id, amount, status, payment_method, checkout_id, receipt_description")
      .eq("parent_id", profile.id)
      .eq("checkout_id", payment.checkout_id)
      .eq("status", "pending");
    if (group?.length) related = group;
  }

  const amount = related.reduce((sum, row) => sum + Number(row.amount), 0);
  const description =
    related.find((row) => row.receipt_description)?.receipt_description ||
    "תשלום יתרה";

  const checkout = await startCardcomCheckout({
    parentId: profile.id,
    paymentIds: related.map((row) => row.id),
    amount,
    description,
  });

  if (!checkout.success) {
    return { success: false, error: checkout.error };
  }

  return { success: true, checkoutUrl: checkout.checkoutUrl };
}
