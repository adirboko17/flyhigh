"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";

interface SiblingDiscountEditorProps {
  tiers: SiblingDiscountTier[];
  onChange: (tiers: SiblingDiscountTier[]) => void;
  disabled?: boolean;
}

/** עורך מדרגות הנחת אחים — "מ־X ילדים ומעלה, Y% הנחה על הילד השני ומעלה בלבד". */
export function SiblingDiscountEditor({
  tiers,
  onChange,
  disabled,
}: SiblingDiscountEditorProps) {
  function update(index: number, patch: Partial<SiblingDiscountTier>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  function add() {
    const nextMin = Math.max(2, ...tiers.map((tier) => tier.minChildren + 1));
    onChange([...tiers, { minChildren: nextMin, percent: 5 }]);
  }

  return (
    <div className="space-y-3">
      {tiers.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-400">
          לא הוגדרו מדרגות — לא תינתן הנחת בני משפחה.
        </p>
      )}

      <ul className="space-y-2">
        {tiers.map((tier, index) => (
          <li
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5"
          >
            <span className="text-sm text-ink-600">החל מ־</span>
            <Input
              type="number"
              min={2}
              max={20}
              value={tier.minChildren}
              disabled={disabled}
              onChange={(e) =>
                update(index, { minChildren: Number(e.target.value) })
              }
              className="w-20"
              aria-label="מספר ילדים מינימלי"
            />
            <span className="text-sm text-ink-600">ילדים —</span>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={tier.percent}
              disabled={disabled}
              onChange={(e) => update(index, { percent: Number(e.target.value) })}
              className="w-24"
              aria-label="אחוז הנחה"
            />
            <span className="text-sm text-ink-600">% הנחה מהילד הזה ומעלה</span>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              className="ms-auto rounded-lg px-2 py-1 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              הסרה
            </button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled || tiers.length >= 6}
      >
        הוספת מדרגה
      </Button>
    </div>
  );
}

/** תצוגה בלבד של מדרגות פעילות, למצב "ברירת מחדל". */
export function SiblingDiscountSummary({ tiers }: { tiers: SiblingDiscountTier[] }) {
  if (tiers.length === 0) {
    return <p className="text-sm text-ink-400">לא הוגדרה הנחת בני משפחה.</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-ink-600">
      {[...tiers]
        .sort((a, b) => a.minChildren - b.minChildren)
        .map((tier) => (
          <li key={tier.minChildren}>
            {tier.minChildren} ילדים ומעלה — {tier.percent}% הנחה מהילד ה־
            {tier.minChildren} ומעלה
          </li>
        ))}
    </ul>
  );
}
