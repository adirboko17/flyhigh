import {
  isCollectionPaymentMethod,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type PaymentSplitPart = {
  method: CollectionPaymentMethod;
  amount: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseSplitParts(
  parts: { method: string; amount: number | string }[] | null | undefined
): { ok: true; parts: PaymentSplitPart[] } | { ok: false; error: string } {
  if (!parts || parts.length < 2) {
    return { ok: false, error: "פיצול תשלום דורש לפחות שני חלקים." };
  }
  if (parts.length > 6) {
    return { ok: false, error: "אפשר לפצל לעד שישה חלקים." };
  }

  const parsed: PaymentSplitPart[] = [];
  for (const part of parts) {
    if (!isCollectionPaymentMethod(part.method)) {
      return { ok: false, error: "אמצעי תשלום בפיצול אינו תקין." };
    }
    const amount = round2(Number(part.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "כל חלק בפיצול חייב להיות סכום חיובי." };
    }
    parsed.push({ method: part.method, amount });
  }

  return { ok: true, parts: parsed };
}

export function splitPartsSum(parts: PaymentSplitPart[]) {
  return round2(parts.reduce((sum, part) => sum + part.amount, 0));
}

export function splitPartsMatchTotal(parts: PaymentSplitPart[], total: number) {
  return Math.abs(splitPartsSum(parts) - round2(total)) <= 0.05;
}

/** מחלק כל חלק בפיצול בין סכומי המשתתפים, בלי לאבד אגורות. */
export function allocateSplitParts(
  parts: PaymentSplitPart[],
  shares: number[]
): PaymentSplitPart[][] {
  if (shares.length <= 1) return [parts];

  const shareTotal = round2(shares.reduce((sum, share) => sum + share, 0));
  if (shareTotal <= 0) {
    return shares.map(() => []);
  }

  return shares.map((share, shareIndex) => {
    const isLast = shareIndex === shares.length - 1;
    return parts
      .map((part) => {
        if (isLast) {
          const already = shares.slice(0, -1).reduce((sum, previousShare) => {
            return sum + round2((part.amount * previousShare) / shareTotal);
          }, 0);
          return { method: part.method, amount: round2(part.amount - already) };
        }
        return {
          method: part.method,
          amount: round2((part.amount * share) / shareTotal),
        };
      })
      .filter((part) => part.amount > 0);
  });
}

export async function syncEnrollmentPaymentStatus(
  supabase: SupabaseClient<Database>,
  enrollmentId: string | null | undefined
) {
  if (!enrollmentId) return;
  const client = isAdminClientConfigured() ? createAdminClient() : supabase;
  await client.rpc("sync_enrollment_payment_status", {
    p_enrollment_id: enrollmentId,
  });
}
