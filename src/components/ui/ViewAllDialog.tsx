"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

interface ViewAllDialogProps {
  title: string;
  description?: string;
  /** תווית הכפתור שפותח את החלון. */
  label?: string;
  /** מספר הפריטים המלא — מוצג כתג לצד התווית. */
  count?: number;
  disabled?: boolean;
  className?: string;
  /**
   * תוכן החלון. נבנה בשרת ומועבר כ־children, כך שכל העיצוב והחישובים
   * נשארים ברכיב השרת ולדפדפן מגיע רק ניהול הפתיחה והסגירה.
   */
  children: React.ReactNode;
}

/** כפתור "צפה בהכל" שפותח את הרשימה המלאה בחלון קופץ. */
export function ViewAllDialog({
  title,
  description,
  label = "צפה בהכל",
  count,
  disabled,
  className,
  children,
}: ViewAllDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:text-ink-300",
          className
        )}
      >
        {label}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-brand-100 px-1.5 text-xs font-bold tabular-nums text-brand-700">
            {count}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        className="max-w-2xl"
      >
        {children}
      </Modal>
    </>
  );
}
