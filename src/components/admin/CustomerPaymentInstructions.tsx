"use client";

import { useEffect, useState } from "react";
import { PaymentMethodNoteCard } from "@/components/payments/PaymentMethodNoteCard";
import { loadCustomerPaymentInstructions } from "@/lib/admin/paymentMethodNoteActions";

export function CustomerPaymentInstructions({
  parentId,
}: {
  parentId: string;
}) {
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof loadCustomerPaymentInstructions>> | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    loadCustomerPaymentInstructions(parentId).then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  if (rows === null || rows.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-ink-900">
        הוראות תשלום
      </h3>
      <p className="mb-3 text-sm text-ink-500">
        לפי אמצעי התשלום שרשומים ללקוח — כולל הערות ארוכות.
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <PaymentMethodNoteCard
            key={row.method}
            method={row.method}
            note={row.note}
          />
        ))}
      </div>
    </div>
  );
}
