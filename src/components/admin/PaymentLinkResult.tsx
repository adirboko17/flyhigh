"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils/format";

function whatsappHref(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("0")
    ? `972${digits.slice(1)}`
    : digits.startsWith("972")
      ? digits
      : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

export function PaymentLinkResult({
  url,
  amount,
  phone,
  subject,
}: {
  url: string;
  amount: number;
  phone?: string | null;
  subject?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const label = subject?.trim();
  const message = `שלום, מצורף קישור לתשלום${label ? ` עבור ${label}` : ""} על סך ${formatCurrency(amount)}:\n${url}`;
  const whatsapp = phone ? whatsappHref(phone, message) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
      <p className="text-sm leading-relaxed text-ink-700">
        הלינק מוכן. הלקוח מזין את הכרטיס אצלו, וברגע שהתשלום עובר החיוב מסומן
        כשולם.
      </p>
      <input
        readOnly
        value={url}
        dir="ltr"
        onFocus={(event) => event.currentTarget.select()}
        className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-left text-xs text-ink-800"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void copy()}>
          {copied ? "הלינק הועתק" : "העתקת לינק"}
        </Button>
        {whatsapp && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(whatsapp, "_blank", "noopener,noreferrer")}
          >
            שליחה בוואטסאפ
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
          פתיחה אצלי
        </Button>
      </div>
    </div>
  );
}
