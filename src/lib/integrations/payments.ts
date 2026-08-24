/**
 * שכבת הפשטה לסליקה. החיוב בכרטיס אשראי עובר לדף Low Profile של קארדקום.
 */

import { startCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import type { CardcomInstallments } from "@/lib/integrations/cardcom";

export interface CreateChargeInput {
  amount: number;
  description: string;
  parentId: string;
  enrollmentId?: string;
  method?: string;
  paymentIds?: string[];
  couponRedemptionId?: string | null;
  metadata?: Record<string, unknown>;
  installments?: CardcomInstallments | null;
}

export interface ChargeResult {
  success: boolean;
  reference: string;
  /** כתובת לדף התשלום המאובטח של קארדקום. */
  redirectUrl?: string;
  error?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  refund(reference: string, amount?: number): Promise<ChargeResult>;
}

class CardcomPaymentProvider implements PaymentProvider {
  readonly name = "cardcom";

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    if (!input.paymentIds?.length) {
      return {
        success: false,
        reference: "",
        error: "חסרים חיובים לפתיחת דף הסליקה.",
      };
    }

    const checkout = await startCardcomCheckout({
      parentId: input.parentId,
      paymentIds: input.paymentIds,
      amount: input.amount,
      description: input.description,
      couponRedemptionId: input.couponRedemptionId,
      installments: input.installments,
    });

    if (!checkout.success) {
      return { success: false, reference: "", error: checkout.error };
    }

    return {
      success: true,
      reference: checkout.reference,
      redirectUrl: checkout.checkoutUrl,
    };
  }

  async refund(reference: string): Promise<ChargeResult> {
    return {
      success: false,
      reference,
      error: "החזרים מתבצעים כרגע מממשק קארדקום.",
    };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = new CardcomPaymentProvider();
  }
  return provider;
}
