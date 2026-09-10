import { createClient } from "@/lib/supabase/client";
import {
  PAYMENT_METHOD_NOTES_KEY,
  parsePaymentMethodNotes,
  type PaymentMethodNotes,
} from "@/lib/payments/methodNotes";

export async function fetchPaymentMethodNotes(): Promise<PaymentMethodNotes> {
  const supabase = createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", PAYMENT_METHOD_NOTES_KEY)
    .maybeSingle();
  return parsePaymentMethodNotes(data?.value);
}
