"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { payOpenCreditCharge } from "@/lib/payments/actions";

export function PayOpenChargeButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setLoading(true);
    const result = await payOpenCreditCharge(paymentId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    window.location.assign(result.checkoutUrl);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        onClick={handlePay}
        disabled={loading}
      >
        {loading ? "פותח..." : "שלם עכשיו"}
      </Button>
      {error && (
        <p className="max-w-40 text-end text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
