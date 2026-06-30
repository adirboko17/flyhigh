/**
 * שכבת הפשטה להפקת חשבוניות/קבלות.
 * בעתיד: חיבור ל"חשבונית ירוקה" / iCount וכד'.
 */

export interface IssueReceiptInput {
  parentName: string;
  parentEmail?: string;
  amount: number;
  description: string;
  paymentId: string;
}

export interface ReceiptResult {
  success: boolean;
  receiptNumber: string;
  receiptUrl?: string;
}

export interface InvoiceProvider {
  readonly name: string;
  issueReceipt(input: IssueReceiptInput): Promise<ReceiptResult>;
}

class MockInvoiceProvider implements InvoiceProvider {
  readonly name = "mock";

  async issueReceipt(input: IssueReceiptInput): Promise<ReceiptResult> {
    const year = new Date().getFullYear();
    return {
      success: true,
      receiptNumber: `${year}-${Math.floor(Math.random() * 9000 + 1000)}`,
      receiptUrl: undefined,
    };
  }
}

let provider: InvoiceProvider | null = null;

export function getInvoiceProvider(): InvoiceProvider {
  if (!provider) {
    // TODO: בעתיד - חיבור לחשבונית ירוקה
    provider = new MockInvoiceProvider();
  }
  return provider;
}
