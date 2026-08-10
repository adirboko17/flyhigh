import type { SupabaseClient } from "@supabase/supabase-js";
import { buildReceiptDescription } from "@/lib/receipt-labels";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

/** מאמת תווית פעילה ומחזיר את הטקסט לשמירה על התשלום. */
export async function resolveReceiptLabelForCheckout(
  supabase: Client,
  receiptLabelId: string | null | undefined
): Promise<
  | { ok: true; labelId: string | null; description: string | null }
  | { ok: false; error: string }
> {
  if (!receiptLabelId) {
    return { ok: true, labelId: null, description: null };
  }

  const { data, error } = await supabase
    .from("receipt_labels")
    .select("id, label, is_active")
    .eq("id", receiptLabelId)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return {
      ok: false,
      error: "תווית הקבלה שנבחרה אינה זמינה. רעננו ובחרו שוב.",
    };
  }

  return { ok: true, labelId: data.id, description: data.label };
}

export function chargeDescriptionForCheckout(input: {
  productTitle: string;
  participantCount: number;
  kind: "class" | "plan";
  customLabel: string | null;
}) {
  return buildReceiptDescription(input);
}
