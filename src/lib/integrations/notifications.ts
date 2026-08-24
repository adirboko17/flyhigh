/**
 * שליחת מיילים. כשיש RESEND_API_KEY — Resend. אחרת דמה ללוג מקומי.
 */

import { Resend } from "resend";

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
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:mock] → ${message.to} | ${message.subject}`);
    }
    return { success: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  async send(message: EmailMessage): Promise<{ success: boolean }> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!apiKey || !from) return { success: false };

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (error) {
      console.error("[email:resend]", error.message);
      return { success: false };
    }

    return { success: true };
  }
}

let emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider =
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()
        ? new ResendEmailProvider()
        : new MockEmailProvider();
  }
  return emailProvider;
}

export function getAdminNotifyEmail() {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || "bokobzadir@gmail.com";
}
