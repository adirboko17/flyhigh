"use client";

import { useEffect, useState } from "react";
import { loadMyCustomerBalance } from "@/lib/payments/customerBalanceActions";
import { formatCurrency } from "@/utils/format";

export function cashDueAfterBalance(
  total: number,
  balance: number,
  enabled: boolean
) {
  if (!enabled || balance <= 0 || total <= 0) return Math.max(total, 0);
  const applied = Math.min(balance, total);
  return Math.max(Math.round((total - applied) * 100) / 100, 0);
}

export function useCheckoutBalance() {
  const [balance, setBalance] = useState(0);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadMyCustomerBalance()
      .then((value) => {
        if (!cancelled) setBalance(value);
      })
      .catch(() => {
        if (!cancelled) setBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { balance, enabled, setEnabled };
}

export function BalanceApplyField({
  balance,
  total,
  enabled,
  onEnabledChange,
  disabled,
}: {
  balance: number;
  total: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  if (balance <= 0 || total <= 0) return null;
  const applied = enabled ? Math.min(balance, total) : 0;
  const cashDue = cashDueAfterBalance(total, balance, enabled);

  return (
    <div className="rounded-2xl border border-aqua-200 bg-aqua-50 px-4 py-3 text-sm text-aqua-950">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-aqua-300 text-brand-600 focus:ring-brand-300"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          disabled={disabled}
        />
        <span>
          <span className="font-semibold">שימוש ביתרה באתר</span>
          <span className="mt-0.5 block text-aqua-800">
            יתרה זמינה {formatCurrency(balance)}
          </span>
        </span>
      </label>
      {enabled && (
        <div className="mt-3 space-y-1 border-t border-aqua-200 pt-3">
          <div className="flex justify-between gap-3">
            <span>מהיתרה</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(applied)}
            </span>
          </div>
          <div className="flex justify-between gap-3 font-semibold">
            <span>נותר לתשלום</span>
            <span className="tabular-nums">{formatCurrency(cashDue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
