"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  COLLECTION_PAYMENT_METHODS,
  PAYMENT_METHOD,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

export type PaymentSplitDraft = {
  method: CollectionPaymentMethod;
  amount: string;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function emptySplitDrafts(
  total: number,
  firstMethod: CollectionPaymentMethod,
  secondMethod: CollectionPaymentMethod = firstMethod === "cash"
    ? "maccabi"
    : "cash"
): PaymentSplitDraft[] {
  const safeTotal = round2(Math.max(0, total));
  const first = round2(Math.floor(safeTotal * 50) / 100);
  const second = round2(safeTotal - first);
  return [
    { method: firstMethod, amount: first ? String(first) : "" },
    { method: secondMethod, amount: second ? String(second) : "" },
  ];
}

export function PaymentSplitEditor({
  parts,
  onChange,
  total,
  disabled = false,
}: {
  parts: PaymentSplitDraft[];
  onChange: (parts: PaymentSplitDraft[]) => void;
  total: number;
  disabled?: boolean;
}) {
  const sum = round2(
    parts.reduce((acc, part) => acc + (Number(part.amount) || 0), 0)
  );
  const target = round2(Math.max(0, total));
  const delta = round2(target - sum);

  function update(index: number, patch: Partial<PaymentSplitDraft>) {
    onChange(parts.map((part, i) => (i === index ? { ...part, ...patch } : part)));
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {parts.map((part, index) => (
          <li
            key={index}
            className="grid grid-cols-[1fr_7rem_auto] items-center gap-2"
          >
            <Select
              value={part.method}
              disabled={disabled}
              aria-label={`אמצעי תשלום לחלק ${index + 1}`}
              onChange={(e) =>
                update(index, {
                  method: e.target.value as CollectionPaymentMethod,
                })
              }
            >
              {COLLECTION_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD[method]}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={part.amount}
              disabled={disabled}
              aria-label={`סכום לחלק ${index + 1}`}
              onChange={(e) => update(index, { amount: e.target.value })}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || parts.length <= 2}
              onClick={() => onChange(parts.filter((_, i) => i !== index))}
            >
              הסרה
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || parts.length >= 6}
          onClick={() =>
            onChange([...parts, { method: "cash", amount: delta > 0 ? String(delta) : "" }])
          }
        >
          הוספת חלק
        </Button>
        <p
          className={cn(
            "text-sm tabular-nums",
            Math.abs(delta) <= 0.05 ? "text-aqua-700" : "text-amber-700"
          )}
        >
          {Math.abs(delta) <= 0.05
            ? `סה״כ ${formatCurrency(sum)}`
            : `סה״כ ${formatCurrency(sum)} · נותר לחלק ${formatCurrency(delta)}`}
        </p>
      </div>
    </div>
  );
}
