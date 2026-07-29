"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import {
  A11Y_DEFAULTS,
  A11Y_FONT_STEPS,
  applyA11ySettings,
  readA11ySettings,
  saveA11ySettings,
  type A11yContrast,
  type A11ySettings,
} from "./a11ySettings";

/** אייקונים פנימיים — כל אייקון הוא רשימת נתיבי SVG על גריד 24x24. */
const GLYPHS = {
  accessibility: [
    "M5.5 8.6c2.05.83 4.25 1.25 6.5 1.25s4.45-.42 6.5-1.25",
    "M12 9.85V14",
    "M9 20.5l1.9-6.5h2.2l1.9 6.5",
  ],
  textPlus: ["M3.5 19 8.75 5h1.5L15.5 19", "M5.9 14.4h7.2", "M18.5 10v6", "M15.5 13h6"],
  textMinus: ["M3.5 19 8.75 5h1.5L15.5 19", "M5.9 14.4h7.2", "M15.5 13h6"],
  moon: ["M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"],
  sun: [
    "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z",
    "M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4",
  ],
  palette: [
    "M12 3.2a8.8 8.8 0 1 0 0 17.6c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.4-.4-.4-.6-.9-.6-1.4 0-1.1.9-2 2-2h1.4a5 5 0 0 0 4.6-5c0-3.2-3.9-5.8-8.8-5.8Z",
    "M7.6 10.6h.01M11 7.8h.01M15 9.2h.01",
  ],
  link: [
    "M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2-2a4.5 4.5 0 0 0-6.4-6.4l-1 1",
    "M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2 2a4.5 4.5 0 0 0 6.4 6.4l1-1",
  ],
  font: ["M4.5 7V5h15v2", "M12 5v14", "M9 19h6"],
  spacing: ["M9 6h12M9 12h12M9 18h12", "M3.5 8.5 5.5 6l2 2.5", "M3.5 15.5l2 2.5 2-2.5", "M5.5 6v12"],
  pause: [
    "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z",
    "M10.2 9v6M13.8 9v6",
  ],
  cursor: ["M5.5 3.2 18.8 11l-5.7 1.4-2.5 5.6-5.1-14.8Z"],
  keyboard: [
    "M3 7.5h18v9H3v-9Z",
    "M6.5 10.5h.01M9.5 10.5h.01M12.5 10.5h.01M15.5 10.5h.01M8 13.5h8",
  ],
  reset: ["M3.5 12a8.5 8.5 0 1 0 2.9-6.4", "M3.2 4.2v5h5"],
  close: ["M18 6 6 18M6 6l12 12"],
} as const;

function Glyph({
  name,
  size = 20,
}: {
  name: keyof typeof GLYPHS;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {name === "accessibility" && (
        <circle cx="12" cy="5" r="1.9" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}

function countActive(settings: A11ySettings): number {
  return (
    Object.keys(A11Y_DEFAULTS) as Array<keyof A11ySettings>
  ).filter((key) => settings[key] !== A11Y_DEFAULTS[key]).length;
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(A11Y_DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = readA11ySettings();
    setSettings(stored);
    applyA11ySettings(stored);
  }, []);

  useEffect(() => {
    if (!open) return;

    // התפריט מופיע ב-DOM לפני הכפתור, ולכן בלי העברת מיקוד יזומה
    // ניווט במקלדת היה מדלג עליו.
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function update(patch: Partial<A11ySettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    applyA11ySettings(next);
    saveA11ySettings(next);
  }

  function setContrast(value: A11yContrast) {
    update({ contrast: settings.contrast === value ? "off" : value });
  }

  function reset() {
    setSettings(A11Y_DEFAULTS);
    applyA11ySettings(A11Y_DEFAULTS);
    saveA11ySettings(A11Y_DEFAULTS);
  }

  const activeCount = countActive(settings);
  const fontScale = A11Y_FONT_STEPS[settings.fontStep] ?? 100;
  const maxStep = A11Y_FONT_STEPS.length - 1;

  return (
    <div className="a11y-ui">
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-label="הגדרות נגישות"
          tabIndex={-1}
          className="fixed bottom-[84px] left-4 z-[120] w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,0.45)] focus:outline-none sm:bottom-[96px] sm:left-6"
        >
          <div className="flex items-center justify-between gap-2 bg-[linear-gradient(95deg,var(--logo-magenta)_0%,var(--brand-500)_100%)] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Glyph name="accessibility" size={20} />
              </span>
              <div>
                <p className="font-display text-[15px] font-extrabold leading-tight">
                  תפריט נגישות
                </p>
                <p className="text-[11px] text-white/85">
                  ההעדפות נשמרות במכשיר שלכם
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label="סגירת תפריט הנגישות"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Glyph name="close" size={17} />
            </button>
          </div>

          <div className="max-h-[min(66vh,520px)] space-y-4 overflow-y-auto p-4">
            <section>
              <SectionTitle>גודל הטקסט</SectionTitle>
              <div className="flex items-center gap-2">
                <StepButton
                  glyph="textMinus"
                  label="הקטנת הטקסט"
                  disabled={settings.fontStep === 0}
                  onClick={() =>
                    update({ fontStep: Math.max(0, settings.fontStep - 1) })
                  }
                />
                <div className="flex-1 rounded-xl border border-ink-200 bg-ink-50 py-2 text-center">
                  <span className="font-display text-sm font-extrabold text-ink-800">
                    {fontScale}%
                  </span>
                </div>
                <StepButton
                  glyph="textPlus"
                  label="הגדלת הטקסט"
                  disabled={settings.fontStep === maxStep}
                  onClick={() =>
                    update({ fontStep: Math.min(maxStep, settings.fontStep + 1) })
                  }
                />
              </div>
            </section>

            <section>
              <SectionTitle>ניגודיות וצבע</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                <Tile
                  glyph="moon"
                  label="ניגודיות כהה"
                  active={settings.contrast === "dark"}
                  onClick={() => setContrast("dark")}
                />
                <Tile
                  glyph="sun"
                  label="ניגודיות בהירה"
                  active={settings.contrast === "light"}
                  onClick={() => setContrast("light")}
                />
                <Tile
                  glyph="palette"
                  label="תמונות בגווני אפור"
                  active={settings.grayscaleMedia}
                  onClick={() =>
                    update({ grayscaleMedia: !settings.grayscaleMedia })
                  }
                />
              </div>
            </section>

            <section>
              <SectionTitle>קריאות</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                <Tile
                  glyph="link"
                  label="הדגשת קישורים"
                  active={settings.highlightLinks}
                  onClick={() =>
                    update({ highlightLinks: !settings.highlightLinks })
                  }
                />
                <Tile
                  glyph="font"
                  label="פונט קריא"
                  active={settings.readableFont}
                  onClick={() => update({ readableFont: !settings.readableFont })}
                />
                <Tile
                  glyph="spacing"
                  label="ריווח שורות"
                  active={settings.wideSpacing}
                  onClick={() => update({ wideSpacing: !settings.wideSpacing })}
                />
              </div>
            </section>

            <section>
              <SectionTitle>ניווט ותנועה</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                <Tile
                  glyph="pause"
                  label="עצירת אנימציות"
                  active={settings.reduceMotion}
                  onClick={() => update({ reduceMotion: !settings.reduceMotion })}
                />
                <Tile
                  glyph="cursor"
                  label="סמן עכבר גדול"
                  active={settings.bigCursor}
                  onClick={() => update({ bigCursor: !settings.bigCursor })}
                />
                <Tile
                  glyph="keyboard"
                  label="הדגשת מיקוד"
                  active={settings.strongFocus}
                  onClick={() => update({ strongFocus: !settings.strongFocus })}
                />
              </div>
            </section>

            <button
              type="button"
              onClick={reset}
              disabled={activeCount === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:text-ink-300"
            >
              <Glyph name="reset" size={17} />
              איפוס כל ההגדרות
            </button>
          </div>

          <div className="border-t border-ink-100 bg-ink-50 px-4 py-3 text-center">
            <Link
              href="/accessibility"
              onClick={() => setOpen(false)}
              className="text-[13px] font-bold text-brand-600 hover:underline"
            >
              הצהרת הנגישות של האתר
            </Link>
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות"
        title="תפריט נגישות"
        className="fixed bottom-4 left-4 z-[120] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--logo-magenta)_0%,var(--brand-500)_100%)] text-white shadow-[0_14px_34px_-10px_rgba(236,0,140,0.55)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:bottom-6 sm:left-6 sm:h-14 sm:w-14"
      >
        <span className="sm:hidden">
          <Glyph name="accessibility" size={26} />
        </span>
        <span className="hidden sm:block">
          <Glyph name="accessibility" size={30} />
        </span>
        {activeCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 left-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-aqua-500 px-1 text-[10px] font-extrabold text-white"
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-400">
      {children}
    </h3>
  );
}

function StepButton({
  glyph,
  label,
  onClick,
  disabled,
}: {
  glyph: keyof typeof GLYPHS;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-11 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:border-ink-100 disabled:bg-ink-50 disabled:text-ink-300"
    >
      <Glyph name={glyph} size={19} />
    </button>
  );
}

function Tile({
  glyph,
  label,
  active,
  onClick,
}: {
  glyph: keyof typeof GLYPHS;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-ink-200 bg-white text-ink-600 hover:border-brand-200 hover:bg-ink-50"
      )}
    >
      <Glyph name={glyph} size={21} />
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </button>
  );
}
