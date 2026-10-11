"use server";

import {
  getContactInboxEmail,
  getEmailProvider,
} from "@/lib/integrations/notifications";

const SUBJECTS: Record<string, string> = {
  general: "פנייה כללית",
  classes: "חוגים והרשמה",
  programs: "מסלולים וכניסות",
  other: "אחר",
};

export type ContactFormInput = {
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
};

function trim(value: string | undefined) {
  return (value ?? "").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildHtml(input: {
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}) {
  const rows = [
    ["שם", input.fullName],
    ["טלפון", input.phone],
    ["אימייל", input.email],
    ["נושא", input.subject],
  ]
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 0;color:#64748b;width:90px;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#0f172a;font-weight:600">${escapeHtml(value)}</td>
      </tr>`
    )
    .join("");

  return `
  <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">
      <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a">פנייה חדשה מטופס צור קשר</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      <p style="margin:16px 0 6px;color:#64748b;font-size:14px">הודעה</p>
      <p style="margin:0;white-space:pre-wrap;color:#0f172a;font-size:15px">${escapeHtml(input.message)}</p>
    </div>
  </div>`;
}

export async function submitContactForm(
  input: ContactFormInput
): Promise<{ success: boolean; error?: string }> {
  if (trim(input.website)) {
    return { success: true };
  }

  const fullName = trim(input.fullName);
  const phone = trim(input.phone);
  const email = trim(input.email).toLowerCase();
  const subjectKey = trim(input.subject);
  const message = trim(input.message);
  const subjectLabel = SUBJECTS[subjectKey];

  if (fullName.length < 2 || fullName.length > 80) {
    return { success: false, error: "נא למלא שם מלא." };
  }
  if (phone.length < 9 || phone.length > 20) {
    return { success: false, error: "נא למלא מספר טלפון." };
  }
  if (!isEmail(email) || email.length > 120) {
    return { success: false, error: "נא למלא כתובת אימייל תקינה." };
  }
  if (!subjectLabel) {
    return { success: false, error: "נא לבחור נושא פנייה." };
  }
  if (message.length < 2 || message.length > 4000) {
    return { success: false, error: "נא לכתוב הודעה." };
  }

  const to = getContactInboxEmail();
  if (!to) {
    return { success: false, error: "שליחת הפנייה לא זמינה כרגע. נסו שוב מאוחר יותר." };
  }

  const provider = getEmailProvider();
  try {
    const sent = await provider.send({
      to,
      replyTo: email,
      subject: `פנייה מהאתר — ${subjectLabel} · ${fullName}`,
      html: buildHtml({
        fullName,
        phone,
        email,
        subject: subjectLabel,
        message,
      }),
    });

    if (!sent.success) {
      console.error("[contact-form] send failed", { provider: provider.name });
      return {
        success: false,
        error: "לא הצלחנו לשלוח את הפנייה. נסו שוב בעוד כמה דקות.",
      };
    }
  } catch (error) {
    console.error("[contact-form]", error);
    return {
      success: false,
      error: "לא הצלחנו לשלוח את הפנייה. נסו שוב בעוד כמה דקות.",
    };
  }

  return { success: true };
}
