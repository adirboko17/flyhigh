"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/utils/cn";

/** מחירון מתקפל — שומר על גובה אחיד של כרטיסי פעילות עד שלוחצים לצפייה. */
export function CollapsiblePriceRows({
  featured = false,
  compact = false,
  children,
}: {
  featured?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-3" data-card-disclosure="">
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold transition-colors",
          featured
            ? "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
            : "bg-ink-50 text-brand-700 ring-1 ring-ink-100 hover:bg-brand-50 hover:ring-brand-200"
        )}
      >
        {open ? "הסתרת מחירון" : "לצפייה במחירים"}
        <Icon
          name="arrow"
          size={12}
          className={cn(
            "opacity-70 transition-transform",
            open ? "-rotate-90" : "rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn(compact ? "pt-2" : "pt-2.5")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
