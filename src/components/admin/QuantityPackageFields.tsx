"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export type PackageDraft = { quantity: string; price: string };

const MAX_ROWS = 8;

export function QuantityPackageFields({
  unitPlural,
  unitSingular,
  rows,
  onChange,
  disabled,
}: {
  unitPlural: string;
  unitSingular: string;
  rows: PackageDraft[];
  onChange: (rows: PackageDraft[]) => void;
  disabled?: boolean;
}) {
  function update(index: number, patch: Partial<PackageDraft>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink-800">חבילות ומחיר</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          כל שורה היא מחיר כולל לכמות. חבילה גדולה יכולה לעלות פחות ליחידה —
          למשל 5 {unitPlural} ב-750 ₪ ו-10 ב-1,000 ₪.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => {
          const quantity = Number(row.quantity);
          const price = Number(row.price);
          const perUnit =
            Number.isFinite(quantity) &&
            quantity > 0 &&
            Number.isFinite(price) &&
            price >= 0
              ? Math.round(price / quantity)
              : null;
          return (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3"
            >
              <Field label={`כמות ${unitPlural}`} required>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={row.quantity}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, { quantity: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="מחיר כולל (₪)" required>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={row.price}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, { price: event.target.value })
                  }
                  required
                />
              </Field>
              <div className="flex h-11 items-center">
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    disabled={disabled}
                    onClick={() =>
                      onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                    }
                  >
                    הסרה
                  </button>
                ) : (
                  <span className="w-10" />
                )}
              </div>
              {perUnit !== null && rows.length > 1 && (
                <p className="col-span-3 -mt-1 text-xs text-ink-400">
                  {perUnit} ₪ ל{unitSingular}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {rows.length < MAX_ROWS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...rows, { quantity: "", price: "" }])}
        >
          + חבילה
        </Button>
      )}
    </div>
  );
}
