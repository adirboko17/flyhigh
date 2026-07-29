"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { PUBLIC_NAV } from "@/lib/navigation";
import { cn } from "@/utils/cn";
import { BrandLogo } from "./BrandLogo";
import { LogoutButton } from "./LogoutButton";

interface PublicHeaderProps {
  user: { full_name: string; home: string } | null;
  overlayAtTop?: boolean;
}

const SCROLL_THRESHOLD = 24;

function AuthEntryLinks({
  className,
  linkClassName,
  onNavigate,
}: {
  className?: string;
  linkClassName?: string;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "hero-cta-primary ah-btn ah-btn--sm inline-flex items-stretch gap-0 !px-0",
        className
      )}
    >
      <Link
        href="/login"
        onClick={onNavigate}
        className={cn(
          "inline-flex items-center px-3.5 transition-opacity hover:opacity-90",
          linkClassName
        )}
      >
        התחברות
      </Link>
      <span className="flex items-center text-white/75">/</span>
      <Link
        href="/register"
        onClick={onNavigate}
        className={cn(
          "inline-flex items-center px-3.5 transition-opacity hover:opacity-90",
          linkClassName
        )}
      >
        הרשמה
      </Link>
    </div>
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

  const menuButtonClass = cn(
    "flex h-10 w-10 items-center justify-center rounded-lg md:hidden",
    glass ? "text-ink-600 hover:bg-ink-100" : "text-white hover:bg-white/10"
  );

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
    <AuthEntryLinks
      className="!text-xs sm:!text-sm"
      linkClassName="px-2 sm:px-3.5"
    />
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] transition-[background-color,border-color,box-shadow,backdrop-filter,padding] duration-300",
        glass
          ? "border-b border-ink-100/80 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90"
          : "border-b border-transparent bg-transparent pb-0 pt-4 shadow-none backdrop-blur-none max-md:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
      )}
    >
      <div className="container-page relative flex h-16 items-center justify-between gap-2 md:gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(menuButtonClass, "relative z-10 shrink-0")}
          aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
          aria-expanded={open}
        >
          <Icon name={open ? "x" : "menu"} size={22} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-16 items-center justify-center md:static md:h-auto md:w-auto md:justify-start">
          {/* לוגו קטן יותר במובייל כדי שלא יתנגש בכפתור התפריט ובכפתורי ההתחברות. */}
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

      {open && (
        <div
          className={cn(
            "border-t px-4 py-3 md:hidden",
            glass
              ? "border-ink-100 bg-white"
              : "border-white/15 bg-white/90 backdrop-blur-md"
          )}
        >
          <nav className="flex flex-col gap-1" aria-label="ניווט נייד">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(navLinkClass(item.href), "w-full px-4 py-3 text-base")}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <div className="mt-2 border-t border-ink-100 pt-3">
                <LogoutButton
                  overlay={overlayHeader && !glass}
                  className="w-full"
                />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
