/**
 * שכבת הפשטה לשליחת מיילים והתראות.
 * בעתיד: חיבור ל-Resend / SendGrid / SMS / Push.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ success: boolean }>;
}

class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(message: EmailMessage): Promise<{ success: boolean }> {
    // בסביבת פיתוח - רק מתעדים. בעתיד נחבר ספק אמיתי.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:mock] → ${message.to} | ${message.subject}`);
    }
    return { success: true };
  }
}

let emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = new MockEmailProvider();
  }
  return emailProvider;
}
