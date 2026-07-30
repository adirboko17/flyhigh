"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { PUBLIC_NAV } from "@/lib/navigation";
import { THEME_COLOR, refreshThemeColor } from "@/lib/theme-color";
import { cn } from "@/utils/cn";
import { BrandLogo } from "./BrandLogo";
import { LogoutButton } from "./LogoutButton";

interface PublicHeaderProps {
  user: { full_name: string; home: string } | null;
  overlayAtTop?: boolean;
}

const SCROLL_THRESHOLD = 24;

function AuthEntryLink({ className }: { className?: string }) {
  return (
    <Link
      href="/login"
      className={cn(
        "hero-cta-primary ah-btn ah-btn--sm inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 text-xs sm:px-4 sm:text-sm",
        className
      )}
    >
      <Icon name="user" size={15} className="shrink-0 opacity-90" />
      התחברות
    </Link>
  );
}

export function PublicHeader({ user, overlayAtTop = false }: PublicHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const overlayHeader = overlayAtTop;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    // התפריט מכסה את המסך בלבן, ולכן שורות המערכת צריכות להתעדכן מיד.
    refreshThemeColor();

    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const glass = !overlayHeader || scrolled || open;

  const isNavActive = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinkClass = (href: string) => {
    const active = isNavActive(href);

    return cn(
      "relative rounded-full px-4 py-2 font-display text-[15px] font-semibold tracking-wide transition-all duration-200 ease-out",
      !active &&
        "hover:scale-[1.06] active:scale-[0.98] motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
      glass
        ? "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
        : "text-white/85 hover:bg-white/12 hover:text-white",
      active &&
        (glass
          ? "bg-brand-50 text-brand-700 shadow-sm"
          : "bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]")
    );
  };

  const authControls = user ? (
    <>
      <Link
        href={user.home}
        className="ah-btn ah-btn--sm ah-btn--primary whitespace-nowrap text-xs sm:text-sm"
      >
        האזור האישי
      </Link>
      <LogoutButton
        overlay={overlayHeader && !glass}
        className="hidden md:inline-flex"
      />
    </>
  ) : (
    <AuthEntryLink />
  );

  return (
    <>
      <header
        data-public-header
        className={cn(
          "sticky top-[calc(2.25rem+env(safe-area-inset-top,0px))] z-50 w-full transition-[background-color,border-color,box-shadow,backdrop-filter,padding] duration-300 sm:top-0",
          // בלי pointer-events-none ההדר השקוף היה חוסם קליקים על ראש התפריט (הוא ב-z גבוה יותר).
          open
            ? "pointer-events-none border-b border-transparent bg-transparent shadow-none backdrop-blur-none md:pointer-events-auto md:border-ink-100/80 md:bg-white/95 md:pt-[env(safe-area-inset-top,0px)] md:shadow-sm md:backdrop-blur-md"
            : glass
              ? "border-b border-ink-100/80 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90 md:pt-[env(safe-area-inset-top,0px)]"
              : "border-b border-transparent bg-transparent pb-0 pt-4 shadow-none backdrop-blur-none"
        )}
      >
        {/* כשהתפריט פתוח הוא מציג כותרת וכפתור סגירה משלו, ולכן שורת ההדר נעלמת במובייל. */}
        <div
          className={cn(
            "container-page relative flex h-16 items-center justify-between gap-2 transition-opacity duration-200 md:gap-4",
            open &&
              "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100"
          )}
        >
          <button
            type="button"
            data-public-header-menu
            onClick={() => setOpen(true)}
            className={cn(
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center transition-colors md:hidden",
              glass ? "text-ink-700" : "text-white"
            )}
            aria-label="פתיחת תפריט"
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Icon name="menu" size={24} />
          </button>

          {/* במובייל הלוגו ממורכז ביחס לרוחב המסך, ולכן ממוקם אבסולוטית ולא בתוך ה-flex. */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center md:static md:translate-x-0">
            <span className="pointer-events-auto md:hidden">
              <BrandLogo height={38} light={overlayHeader && !glass} />
            </span>
            <span className="pointer-events-auto hidden md:block">
              <BrandLogo height={48} light={overlayHeader && !glass} />
            </span>
          </div>

          <nav
            className="relative z-10 hidden flex-1 items-center justify-center gap-0.5 md:flex lg:gap-1"
            aria-label="ניווט ראשי"
          >
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative z-10 flex shrink-0 items-center gap-2">
            {authControls}
          </div>
        </div>
      </header>

      {/* מחוץ ל-header כי backdrop-filter שלו יוצר containing block ושובר position:fixed. */}
      <MobileMenu
        open={open}
        user={user}
        isNavActive={isNavActive}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function MobileMenu({
  open,
  user,
  isNavActive,
  onClose,
}: {
  open: boolean;
  user: { full_name: string; home: string } | null;
  isNavActive: (href: string) => boolean;
  onClose: () => void;
}) {
  /** השהיה מדורגת לפריטים כדי לקבל כניסה רכה; באפס כשסוגרים כדי שהסגירה תהיה מיידית. */
  const stagger = (index: number) =>
    open ? `${Math.max(0, 90 + index * 55)}ms` : "0ms";

  return (
    <div
      id="mobile-menu"
      data-theme-color-overlay={open ? THEME_COLOR.page : undefined}
      className={cn(
        "fixed inset-0 z-[70] transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none md:hidden",
        open ? "visible opacity-100" : "invisible opacity-0"
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-white/95 backdrop-blur-xl"
        onClick={onClose}
      />

      <div
        className="relative flex h-full flex-col overflow-y-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.25rem+env(safe-area-inset-top,0px))]"
        role="dialog"
        aria-modal={open}
        aria-label="תפריט ניווט"
      >
        <div
          className={cn(
            "flex items-center justify-between gap-4 border-b border-ink-100 pb-5 transition-all duration-500 ease-out motion-reduce:transition-none",
            open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
          style={{ transitionDelay: stagger(-1) }}
        >
          <div>
            <p className="font-display text-[17px] font-extrabold tracking-tight text-ink-900">
              תפריט
            </p>
            <p className="mt-0.5 text-xs text-ink-400">לאן תרצו להגיע?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת תפריט"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-500 shadow-sm transition-colors active:bg-ink-50 active:text-ink-800"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-2" aria-label="ניווט נייד">
          {PUBLIC_NAV.map((item, index) => {
            const active = isNavActive(item.href);

            return (
              <div
                key={item.href}
                className={cn(
                  "transition-all duration-500 ease-out motion-reduce:transition-none",
                  open
                    ? "translate-y-0 opacity-100"
                    : "translate-y-3 opacity-0"
                )}
                style={{ transitionDelay: stagger(index) }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center justify-between rounded-2xl px-5 py-4 font-display text-xl font-bold transition-colors duration-200",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-800 active:bg-ink-50"
                  )}
                >
                  {item.label}
                  <Icon
                    name="arrow"
                    size={20}
                    className={cn(
                      "shrink-0 transition-transform duration-200",
                      active ? "text-brand-500" : "text-ink-300"
                    )}
                  />
                </Link>
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            "mt-auto flex flex-col gap-3 pt-10 transition-all duration-500 ease-out motion-reduce:transition-none",
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          )}
          style={{ transitionDelay: stagger(PUBLIC_NAV.length) }}
        >
          {user ? (
            <>
              <Link
                href={user.home}
                onClick={onClose}
                className="ah-btn ah-btn--md ah-btn--primary ah-btn--block"
              >
                האזור האישי
              </Link>
              <LogoutButton className="w-full justify-center" />
            </>
          ) : (
            <>
              <AuthEntryLink className="!h-11 w-full !text-base" />
              <Link
                href="/register"
                onClick={onClose}
                className="w-full rounded-full py-3 text-center font-semibold text-ink-500 transition-colors active:text-brand-700"
              >
                עדיין אין לכם חשבון? הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
