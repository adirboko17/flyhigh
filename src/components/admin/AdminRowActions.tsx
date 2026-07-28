"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

const menuItemClass =
  "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50";

type AdminRowActionsProps = {
  onDelete: () => Promise<{ error?: string }>;
  itemLabel: string;
  className?: string;
  /** פותח תצוגה מלאה של הפריט; מוצג כפריט הראשון בתפריט. */
  onView?: () => void;
  extraMenuItems?: {
    label: string;
    onClick: () => void | Promise<void>;
    icon?: ReactNode;
  }[];
} & (
  | { editHref: string; onEdit?: never }
  /** לטפסים שנפתחים במודאל במקום בעמוד נפרד. */
  | { onEdit: () => void; editHref?: never }
);

export function AdminRowActions({
  editHref,
  onEdit,
  onView,
  onDelete,
  itemLabel,
  className,
  extraMenuItems = [],
}: AdminRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updateMenuPosition() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 168;
    setMenuPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    });
  }

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleDelete() {
    setOpen(false);
    const confirmed = window.confirm(
      `האם למחוק את ${itemLabel}? פעולה זו לא ניתנת לביטול.`
    );
    if (!confirmed) return;

    setLoading(true);
    const result = await onDelete();
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="פעולות"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 disabled:opacity-50"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-50 min-w-[10.5rem] overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-card"
        >
          {onView && (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onView();
              }}
              className={menuItemClass}
            >
              <EyeMenuIcon className="text-ink-500" />
              צפייה
            </button>
          )}
          {editHref ? (
            <Link
              href={editHref}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className={menuItemClass}
            >
              <EditIcon className="shrink-0 text-brand-600" />
              עריכה
            </Link>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit?.();
              }}
              className={menuItemClass}
            >
              <EditIcon className="shrink-0 text-brand-600" />
              עריכה
            </button>
          )}
          {extraMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                void item.onClick();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <TrashIcon className="shrink-0" />
            {loading ? "מוחק..." : "מחיקה"}
          </button>
        </div>
      )}
    </div>
  );
}

function MoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function EyeOffMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function UserPlusMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function EyeMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
