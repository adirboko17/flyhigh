"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_RECEIPT_LABEL_CHOICE,
  type ReceiptLabelChoice,
  type ReceiptLabelOption,
} from "@/lib/receipt-labels";
import { cn } from "@/utils/cn";

/** בחירת טקסט לקבלה לפני תשלום — אופציונלי, מרשימה שמנהל האדמין. */
export function ReceiptLabelField({
  productTitle,
  value,
  onChange,
  disabled = false,
}: {
  productTitle: string;
  value: ReceiptLabelChoice;
  onChange: (value: ReceiptLabelChoice) => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<ReceiptLabelOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("receipt_labels")
        .select("id, label")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });

      if (cancelled) return;
      setOptions(data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && options.length === 0) {
    return null;
  }

  const selected = options.find((option) => option.id === value.labelId);
  const preview = value.enabled && selected ? selected.label : productTitle;

  return (
    <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-ink-800">
          מבקש/ת פרטים שונים על הקבלה?
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          כברירת מחדל יופיע שם הפעילות שנרכשה. אפשר לבחור טקסט אחר מהרשימה.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToggleChip
          active={!value.enabled}
          disabled={disabled || loading}
          onClick={() => onChange(EMPTY_RECEIPT_LABEL_CHOICE)}
          label="לא, השאר כרגיל"
        />
        <ToggleChip
          active={value.enabled}
          disabled={disabled || loading}
          onClick={() =>
            onChange({
              enabled: true,
              labelId: value.labelId ?? options[0]?.id ?? null,
            })
          }
          label="כן, לבחור טקסט אחר"
        />
      </div>

      {value.enabled && (
        <div>
          <label
            htmlFor="receipt-label-select"
            className="mb-1.5 block text-sm font-semibold text-ink-700"
          >
            מה לרשום על הקבלה
          </label>
          <select
            id="receipt-label-select"
            className="ah-select w-full"
            disabled={disabled || loading}
            value={value.labelId ?? ""}
            onChange={(e) =>
              onChange({
                enabled: true,
                labelId: e.target.value || null,
              })
            }
          >
            <option value="" disabled>
              בחרו אפשרות...
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs text-ink-500">
        על הקבלה יופיע:{" "}
        <span className="font-semibold text-ink-800">{preview}</span>
      </p>
    </div>
  );
}

function ToggleChip({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50",
        active
          ? "bg-brand-600 text-white"
          : "bg-ink-50 text-ink-700 ring-1 ring-ink-100 hover:bg-ink-100"
      )}
    >
      {label}
    </button>
  );
}
