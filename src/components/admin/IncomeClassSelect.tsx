"use client";

import { useMemo } from "react";
import type { IncomeClassOption } from "@/lib/admin/incomeClasses";

function classLabel(item: IncomeClassOption) {
  const name = item.category ? `${item.title} · ${item.category}` : item.title;
  return item.inactive ? `${name} · לא פעיל` : name;
}

export function IncomeClassSelect({
  value,
  classes,
  disabled,
  onChange,
  flush = false,
}: {
  value: string | null;
  classes: IncomeClassOption[];
  disabled?: boolean;
  onChange: (classId: string | null) => void;
  /** בלי רווח עליון, כשהשדה יושב בתוך משבצת משלו. */
  flush?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, IncomeClassOption[]>();
    for (const item of classes) {
      const key = item.category ?? "ללא קטגוריה";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [classes]);

  return (
    <label className={flush ? "flex flex-col gap-1.5" : "mt-2 flex max-w-md flex-col gap-1"}>
      <span className="text-xs font-medium text-ink-500">התשלום עבור החוג</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-9 w-full cursor-pointer rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-ink-50"
      >
        <option value="">בריכה, בלי שיוך לחוג</option>
        {groups.map(([category, items]) => (
          <optgroup key={category} label={category}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {classLabel(item)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
