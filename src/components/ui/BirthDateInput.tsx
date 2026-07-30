"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/cn";

export function BirthDateInput({
  id,
  value,
  onChange,
  max,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  max?: string;
  autoComplete?: string;
}) {
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setToday(local.toISOString().slice(0, 10));
  }, []);

  return (
    <div className="group relative h-11 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-ink-200 bg-white transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
      <Input
        id={id}
        type="date"
        dir="ltr"
        variant="ds"
        className="block h-full !w-full min-w-0 max-w-full appearance-none !border-0 !bg-transparent !px-4 !text-transparent !shadow-none !outline-none !ring-0 [-webkit-text-fill-color:transparent]"
        autoComplete={autoComplete}
        max={max ?? (today || undefined)}
        value={value}
        onChange={onChange}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-between gap-3 px-4",
          value
            ? "font-medium text-ink-800"
            : "text-ink-400 group-focus-within:hidden"
        )}
      >
        <span dir="rtl">
          {value ? formatBirthDate(value) : "בחרו תאריך לידה"}
        </span>
        <Icon name="calendar" size={18} className="shrink-0 text-brand-500" />
      </span>
    </div>
  );
}

const HEBREW_MONTHS = [
  "בינואר",
  "בפברואר",
  "במרץ",
  "באפריל",
  "במאי",
  "ביוני",
  "ביולי",
  "באוגוסט",
  "בספטמבר",
  "באוקטובר",
  "בנובמבר",
  "בדצמבר",
] as const;

function formatBirthDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12 || !day) return value;
  return `${day} ${HEBREW_MONTHS[month - 1]} ${year}`;
}
