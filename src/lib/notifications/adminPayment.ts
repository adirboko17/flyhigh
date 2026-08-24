import { PAYMENT_METHOD } from "@/lib/constants";
import {
  getAdminNotifyEmail,
  getEmailProvider,
} from "@/lib/integrations/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/utils/format";
import type { Enums } from "@/types/database.types";

export type AdminPaymentNotice = {
  paid: boolean;
  parentName: string;
  phone?: string | null;
  email?: string | null;
  product: string;
  amount: number;
  paymentMethod: Enums<"payment_method"> | null;
  participants?: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "";
  return `<tr>
    <td style="padding:6px 0;color:#64748b;width:140px">${escapeHtml(label)}</td>
    <td style="padding:6px 0;color:#0f172a;font-weight:600">${escapeHtml(text)}</td>
  </tr>`;
}

function buildHtml(notice: AdminPaymentNotice) {
  const method = notice.paymentMethod
    ? PAYMENT_METHOD[notice.paymentMethod]
    : "לא צוין";
  const participants =
    notice.participants && notice.participants.length > 0
      ? notice.participants.join(", ")
      : null;

  return `
  <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">
      <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0f172a">
        ${
          notice.paid
            ? notice.paymentMethod === "credit_card"
              ? "לקוח שילם בקארדקום"
              : "התקבל תשלום בגבייה"
            : "לקוח נרשם וצריך לשלם"
        }
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row("שם", notice.parentName)}
        ${row("טלפון", notice.phone)}
        ${row("אימייל", notice.email)}
        ${row("רכישה", notice.product)}
        ${row("משתתפים", participants)}
        ${row("סכום", formatCurrency(notice.amount))}
        ${row("אמצעי תשלום", method)}
        ${row("סטטוס", notice.paid ? "שולם" : "ממתין לתשלום")}
      </table>
    </div>
  </div>`;
}

export async function notifyAdminPayment(notice: AdminPaymentNotice) {
  const to = getAdminNotifyEmail();
  if (!to || notice.amount <= 0) return;

  const subject = notice.paid
    ? `לקוח שילם — ${notice.parentName} · ${formatCurrency(notice.amount)}`
    : `לקוח נרשם וצריך לשלם — ${notice.parentName} · ${formatCurrency(notice.amount)}`;

  try {
    const sent = await getEmailProvider().send({
      to,
      subject,
      html: buildHtml(notice),
    });
    if (!sent.success) {
      console.error("[admin-payment-email] send failed", {
        provider: getEmailProvider().name,
      });
    }
  } catch (error) {
    console.error("[admin-payment-email]", error);
  }
}

export async function notifyAdminCardcomPaid(input: {
  parentId: string;
  amount: number;
  description: string;
  paymentIds: string[];
}) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: payments }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", input.parentId)
      .maybeSingle(),
    admin
      .from("payments")
      .select(
        "receipt_description, enrollments(children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title))"
      )
      .in("id", input.paymentIds),
  ]);

  const participants = [
    ...new Set(
      (payments ?? [])
        .map((payment) => payment.enrollments?.children?.full_name)
        .filter((name): name is string => Boolean(name))
    ),
  ];
  const product =
    (payments ?? []).find((payment) => payment.receipt_description)
      ?.receipt_description ||
    input.description ||
    "רכישה באתר";

  await notifyAdminPayment({
    paid: true,
    parentName: profile?.full_name || "לקוח",
    phone: profile?.phone,
    email: profile?.email,
    product,
    amount: input.amount,
    paymentMethod: "credit_card",
    participants,
  });
}
