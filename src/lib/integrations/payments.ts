/**
 * שכבת הפשטה לסליקה. החיוב בכרטיס אשראי עובר לדף Low Profile של קארדקום.
 */

import { startCardcomCheckout } from "@/lib/payments/cardcomCheckout";
import {
  refundCardcomTransaction,
  type CardcomInstallments,
} from "@/lib/integrations/cardcom";

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
  checkoutId?: string;
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
      source: input.metadata?.cart === true ? "cart" : null,
    });

    if (!checkout.success) {
      return { success: false, reference: "", error: checkout.error };
    }

    return {
      success: true,
      reference: checkout.reference,
      checkoutId: checkout.checkoutId,
      redirectUrl: checkout.checkoutUrl,
    };
  }

  async refund(reference: string, amount?: number): Promise<ChargeResult> {
    if (amount == null || amount <= 0) {
      return {
        success: false,
        reference,
        error: "חסר סכום לזיכוי.",
      };
    }

    try {
      const result = await refundCardcomTransaction({
        transactionId: reference,
        amount,
      });
      return {
        success: true,
        reference: result.refundTransactionId ?? reference,
      };
    } catch (error) {
      return {
        success: false,
        reference,
        error:
          error instanceof Error ? error.message : "הזיכוי בקארדקום נכשל.",
      };
    }
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = new CardcomPaymentProvider();
  }
  return provider;
}
