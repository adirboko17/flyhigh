"use server";

import { revalidatePath } from "next/cache";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  PAYMENT_METHOD_NOTES_KEY,
  parsePaymentMethodNotes,
  serializePaymentMethodNotes,
  type PaymentMethodNotes,
} from "@/lib/payments/methodNotes";
import type { Enums } from "@/types/database.types";

export async function loadPaymentMethodNotes(): Promise<PaymentMethodNotes> {
  const supabase = await createAdminDataClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", PAYMENT_METHOD_NOTES_KEY)
    .maybeSingle();
  return parsePaymentMethodNotes(data?.value);
}

export async function savePaymentMethodNote(input: {
  method: Enums<"payment_method">;
  note: string;
}): Promise<{ error?: string }> {
  const supabase = await createAdminDataClient();
  const { data: currentRow } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", PAYMENT_METHOD_NOTES_KEY)
    .maybeSingle();
  const current = parsePaymentMethodNotes(currentRow?.value);
  const next: PaymentMethodNotes = {
    ...current,
    [input.method]: input.note.trim(),
  };
  if (!next[input.method]) delete next[input.method];

  const value = serializePaymentMethodNotes(next);
  const { data: existing } = await supabase
    .from("system_settings")
    .select("id")
    .eq("key", PAYMENT_METHOD_NOTES_KEY)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("system_settings")
        .update({ value })
        .eq("id", existing.id)
    : await supabase
        .from("system_settings")
        .insert({ key: PAYMENT_METHOD_NOTES_KEY, value });

  if (error) return { error: "שמירת ההערה נכשלה. נסו שוב." };

  revalidatePath("/admin/payment-methods");
  revalidatePath("/admin/customers");
  revalidatePath("/parent/dashboard");
  revalidatePath("/cart");
  revalidatePath("/classes", "layout");
  revalidatePath("/programs");
  return {};
}

export async function loadCustomerPaymentInstructions(parentId: string): Promise<
  {
    method: Enums<"payment_method">;
    note: string;
  }[]
> {
  const supabase = await createAdminDataClient();
  const [{ data: payments }, notes] = await Promise.all([
    supabase
      .from("payments")
      .select("payment_method, status")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false }),
    loadPaymentMethodNotes(),
  ]);

  const seen = new Set<Enums<"payment_method">>();
  const rows: { method: Enums<"payment_method">; note: string }[] = [];
  for (const payment of payments ?? []) {
    const method = payment.payment_method;
    if (!method || seen.has(method)) continue;
    const note = notes[method]?.trim();
    if (!note) continue;
    seen.add(method);
    rows.push({ method, note });
  }
  return rows;
}
