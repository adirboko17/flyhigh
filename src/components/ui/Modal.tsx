"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon";
import { refreshThemeColor, THEME_COLOR } from "@/lib/theme-color";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  // onClose מגיע לרוב כפונקציה חדשה בכל רינדור. בלי ref האפקט שלמטה היה רץ
  // מחדש על כל הקלדה בתוך החלון ומחזיר את המיקוד לחלון עצמו במקום לשדה.
  const onCloseRef = useRef(onClose);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    refreshThemeColor();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      refreshThemeColor();
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  // החלון מוגר ל-body: כשהוא נשאר בתוך העץ, אב עם transform (למשל אנימציית
  // הגלילה של הכרטיסים) הופך למסגרת המיקום של fixed והחלון נחתך בתוך הכרטיס.
  // ה-z גבוה מתפריט הנגישות הצף (120) כדי שלא יצוף מעל החלון.
  return createPortal(
    <div
      data-theme-color-overlay={THEME_COLOR.modalOverlay}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-x-0 bottom-[calc(-1*env(safe-area-inset-bottom))] top-[calc(-1*env(safe-area-inset-top))] bg-ink-950/50 backdrop-blur-[2px]"
        aria-label="סגירת חלון"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          // חלון ממורכז ומרווח בכל המסכים; התוכן הפנימי נשאר גליל בטפסים ורשימות ארוכות.
          "relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card animate-fade-in sm:max-h-[85dvh]",
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="break-words font-display text-lg font-extrabold text-ink-900 sm:text-xl"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="-me-1.5 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
