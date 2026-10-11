"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import {
  clearRegistrationPrompt,
  peekRegistrationPrompt,
} from "@/lib/registration-prompt";
import { refreshThemeColor, THEME_COLOR } from "@/lib/theme-color";

const REVEAL_DELAY_MS = 480;

const OPTIONS: {
  href: string;
  icon: IconName;
  title: string;
  detail: string;
  tone: string;
}[] = [
  {
    href: "/classes",
    icon: "enroll",
    title: "חוגים",
    detail: "קבוצות לפי גיל, לאורך העונה",
    tone: "bg-brand-50 text-brand-700",
  },
  {
    href: "/programs",
    icon: "waves",
    title: "הבריכה",
    detail: "מנויים, כניסות ופעילויות",
    tone: "bg-aqua-50 text-aqua-700",
  },
  {
    href: "/programs#private-lessons",
    icon: "teacher",
    title: "שיעורים פרטיים",
    detail: "תיאום אישי, בקצב שלכם",
    tone: "bg-violet-50 text-violet-700",
  },
];

/**
 * הזמנה עדינה אחרי התחברות, רק לחשבון שעדיין בלי הרשמה.
 * הדגל נכתב בהתחברות ונמחק ברגע שהחלון נפתח, כדי שלא יחזור באותו ביקור.
 */
export function RegistrationOpenPrompt({ eligible }: { eligible: boolean }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!peekRegistrationPrompt()) return;
    if (!eligible) {
      clearRegistrationPrompt();
      return;
    }

    const timer = window.setTimeout(() => {
      if (!peekRegistrationPrompt()) return;
      clearRegistrationPrompt();
      setOpen(true);
    }, REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [eligible]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    refreshThemeColor();
    panelRef.current?.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      refreshThemeColor();
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      data-theme-color-overlay={THEME_COLOR.modalOverlay}
      className="fixed inset-0 z-[300] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
    >
      <button
        type="button"
        className="absolute inset-x-0 bottom-[calc(-1*env(safe-area-inset-bottom))] top-[calc(-1*env(safe-area-inset-top))] bg-ink-950/40 backdrop-blur-[3px]"
        aria-label="סגירת חלון"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-card outline-none motion-safe:animate-fade-in"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-bl from-brand-50 via-white to-aqua-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-aqua-200/40 blur-2xl"
        />

        <div className="relative px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft ring-1 ring-brand-100">
              <Icon name="enroll" size={20} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-white/80 hover:text-ink-700"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <p className="mt-4 text-xs font-semibold tracking-wide text-brand-600">
            ההרשמה פתוחה
          </p>
          <h2
            id={titleId}
            className="mt-1 font-display text-2xl font-extrabold text-ink-900"
          >
            אפשר להירשם עכשיו
          </h2>
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-500">
            עדיין אין הרשמה בחשבון. החוגים, הבריכה והשיעורים זמינים — בחרו מה
            שמתאים לכם.
          </p>

          <ul className="mt-5 space-y-2">
            {OPTIONS.map((option) => (
              <li key={option.href}>
                <Link
                  href={option.href}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white/80 px-3 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${option.tone}`}
                  >
                    <Icon name={option.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink-900">
                      {option.title}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {option.detail}
                    </span>
                  </span>
                  <Icon name="chevron" size={16} className="text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800"
          >
            אולי אחר כך
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
