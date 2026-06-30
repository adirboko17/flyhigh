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

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full transition-[background-color,border-color,box-shadow,backdrop-filter,padding] duration-300",
        glass
          ? "border-b border-ink-100/80 bg-white/80 pt-0 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent pt-4 shadow-none backdrop-blur-none"
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLogo height={48} light={overlayHeader && !glass} />

        <nav className="hidden items-center gap-0.5 md:flex lg:gap-1">
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

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href={user.home}
                className="ah-btn ah-btn--sm ah-btn--primary"
              >
                האזור האישי
              </Link>
              <LogoutButton overlay={overlayHeader && !glass} />
            </>
          ) : (
            <AuthEntryLinks />
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "rounded-lg p-2 md:hidden",
            glass
              ? "text-ink-600 hover:bg-ink-100"
              : "text-white hover:bg-white/10"
          )}
          aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
        >
          <Icon name={open ? "x" : "menu"} size={22} />
        </button>
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
          <nav className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={navLinkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ink-100 pt-3">
              {user ? (
                <Link
                  href={user.home}
                  onClick={() => setOpen(false)}
                  className="ah-btn ah-btn--md ah-btn--primary ah-btn--block"
                >
                  האזור האישי
                </Link>
              ) : (
                <AuthEntryLinks
                  className="ah-btn--md ah-btn--block !h-auto w-full"
                  linkClassName="flex flex-1 justify-center py-3"
                  onNavigate={() => setOpen(false)}
                />
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
