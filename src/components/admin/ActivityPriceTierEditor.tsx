"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  HAFUGA_PRICE_TIERS,
  describeActivityPeopleRange,
  type ActivityPriceTier,
} from "@/lib/finance/activityPricing";
import { formatCurrency } from "@/utils/format";

interface ActivityPriceTierEditorProps {
  tiers: ActivityPriceTier[];
  onChange: (tiers: ActivityPriceTier[]) => void;
  onFillHafuga?: () => void;
  disabled?: boolean;
}

function emptyTier(after?: ActivityPriceTier): ActivityPriceTier {
  const minPeople = after
    ? (after.maxPeople ?? after.minPeople) + 1
    : 2;
  return {
    minPeople,
    maxPeople: minPeople,
    price: 0,
    note: null,
  };
}

/** עורך מדרגות מחיר לקבוצה — "מ־X עד Y נפשות, Z ₪ לקבוצה". */
export function ActivityPriceTierEditor({
  tiers,
  onChange,
  onFillHafuga,
  disabled,
}: ActivityPriceTierEditorProps) {
  function update(index: number, patch: Partial<ActivityPriceTier>) {
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  }

  function remove(index: number) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        כל שורה היא מחיר לקבוצה כולה, לא למשתתף. הטווחים לא יכולים לחפוף —
        אם מספר מופיע בשתי שורות, בחרו באיזו מדרגה הוא נמצא.
      </p>

      {tiers.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-400">
          אין מדרגות — הלקוח ישלם מחיר למשתתף כפול מספר האנשים.
        </p>
      )}

      <ul className="space-y-2">
        {tiers.map((tier, index) => (
          <li
            key={index}
            className="space-y-2 rounded-xl bg-ink-50 px-3 py-2.5 sm:space-y-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-600">מ־</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={tier.minPeople}
                disabled={disabled}
                onChange={(e) =>
                  update(index, { minPeople: Number(e.target.value) })
                }
                className="w-16 px-2"
                aria-label="מינימום משתתפים"
              />
              <span className="text-sm text-ink-600">עד</span>
              <Input
                type="number"
                min={tier.minPeople}
                max={30}
                value={tier.maxPeople ?? ""}
                disabled={disabled}
                placeholder="∞"
                onChange={(e) =>
                  update(index, {
                    maxPeople: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                className="w-16 px-2"
                aria-label="מקסימום משתתפים, ריק בלי תקרה"
              />
              <span className="text-sm text-ink-600">נפשות —</span>
              <Input
                type="number"
                min={0}
                step="1"
                value={tier.price}
                disabled={disabled}
                onChange={(e) => update(index, { price: Number(e.target.value) })}
                className="w-24"
                aria-label="מחיר לקבוצה"
              />
              <span className="text-sm text-ink-600">₪ לקבוצה</span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                className="ms-auto rounded-lg px-2 py-1 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                הסרה
              </button>
            </div>
            <Input
              value={tier.note ?? ""}
              disabled={disabled}
              placeholder="הערה אופציונלית, למשל: לשעתיים"
              onChange={(e) =>
                update(index, { note: e.target.value.trim() ? e.target.value : null })
              }
              aria-label="הערת מדרגה"
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...tiers, emptyTier(tiers[tiers.length - 1])])}
          disabled={disabled || tiers.length >= 12}
        >
          הוספת מדרגה
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange(HAFUGA_PRICE_TIERS);
            onFillHafuga?.();
          }}
          disabled={disabled}
        >
          מילוי מחירון הפוגה
        </Button>
      </div>
    </div>
  );
}

export function ActivityPriceTierSummary({
  tiers,
}: {
  tiers: ActivityPriceTier[];
}) {
  if (tiers.length === 0) {
    return (
      <p className="text-sm text-ink-400">מחיר למשתתף — בלי מדרגות קבוצה.</p>
    );
  }

  return (
    <ul className="space-y-1 text-sm text-ink-600">
      {tiers.map((tier) => (
        <li key={`${tier.minPeople}-${tier.maxPeople ?? "up"}`}>
          {describeActivityPeopleRange(tier)} — {formatCurrency(tier.price)}
          {tier.note ? ` (${tier.note})` : ""}
        </li>
      ))}
    </ul>
  );
}
