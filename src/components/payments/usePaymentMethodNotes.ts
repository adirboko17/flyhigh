"use client";

import { useEffect, useState } from "react";
import { fetchPaymentMethodNotes } from "@/lib/payments/loadMethodNotes";
import type { PaymentMethodNotes } from "@/lib/payments/methodNotes";

export function usePaymentMethodNotes(): PaymentMethodNotes {
  const [notes, setNotes] = useState<PaymentMethodNotes>({});

  useEffect(() => {
    let cancelled = false;
    fetchPaymentMethodNotes().then((data) => {
      if (!cancelled) setNotes(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return notes;
}
