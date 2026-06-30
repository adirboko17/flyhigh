/**
 * שכבת הפשטה לסליקה.
 * כרגע יש מימוש דמה בלבד. בעתיד ניתן לחבר PayPlus / Tranzila / Stripe
 * על ידי הוספת Provider שמממש את הממשק הזה והחלפת getPaymentProvider().
 */

export interface CreateChargeInput {
  amount: number;
  description: string;
  parentId: string;
  enrollmentId?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  success: boolean;
  reference: string;
  /** כתובת לתשלום מאובטח (hosted page) אם רלוונטי. */
  redirectUrl?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  refund(reference: string, amount?: number): Promise<ChargeResult>;
}

/** מימוש דמה — לא מבצע חיוב אמיתי. */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    return {
      success: true,
      reference: `MOCK-${Date.now()}`,
      raw: input,
    };
  }

  async refund(reference: string): Promise<ChargeResult> {
    return { success: true, reference };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    // TODO: בעתיד — לבחור Provider לפי משתנה סביבה (PAYMENT_PROVIDER)
    provider = new MockPaymentProvider();
  }
  return provider;
}
