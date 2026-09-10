import { DEFERRED_PAYMENT_HINT, isDeferredPaymentMethod, PAYMENT_METHOD } from "@/lib/constants";
import type { Enums, Json } from "@/types/database.types";

export const PAYMENT_METHOD_NOTES_KEY = "payment_method_notes";

export type PaymentMethodNotes = Partial<
  Record<Enums<"payment_method">, string>
>;

export const PAYMENT_METHOD_NOTE_ORDER: Enums<"payment_method">[] = [
  "credit_card",
  "cash",
  "bank_transfer",
  "bit",
  "paybox",
  "standing_order",
  "maccabi",
  "amit",
  "pool_pass",
  "external",
];

export function isPaymentMethod(
  value: string
): value is Enums<"payment_method"> {
  return Object.prototype.hasOwnProperty.call(PAYMENT_METHOD, value);
}

export function parsePaymentMethodNotes(value: Json | null | undefined): PaymentMethodNotes {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const notes: PaymentMethodNotes = {};
  for (const [key, note] of Object.entries(value)) {
    if (!isPaymentMethod(key) || typeof note !== "string") continue;
    const trimmed = note.trim();
    if (trimmed) notes[key] = trimmed;
  }
  return notes;
}

export function serializePaymentMethodNotes(
  notes: PaymentMethodNotes
): Record<string, string> {
  const value: Record<string, string> = {};
  for (const method of PAYMENT_METHOD_NOTE_ORDER) {
    const trimmed = notes[method]?.trim() ?? "";
    if (trimmed) value[method] = trimmed;
  }
  return value;
}

export function paymentMethodNote(
  notes: PaymentMethodNotes,
  method: Enums<"payment_method"> | null | undefined,
  options?: { fallbackHint?: boolean }
): string | null {
  if (!method) return null;
  const custom = notes[method]?.trim();
  if (custom) return custom;
  if (options?.fallbackHint && isDeferredPaymentMethod(method)) {
    return DEFERRED_PAYMENT_HINT[method];
  }
  return null;
}
