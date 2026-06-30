"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { PUBLIC_NAV } from "@/lib/navigation";
import { cn } from "@/utils/cn";
import { BrandLogo } from "./BrandLogo";
import { LogoutButton } from "./LogoutButton";

interface PublicHeaderProps {
  user: { full_name: string; home: string } | null;
}

export function PublicHeader({ user }: PublicHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLogo height={48} />

        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900",
                pathname === item.href && "font-semibold text-brand-700"
              )}
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
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="ah-btn ah-btn--sm ah-btn--ghost">
                התחברות
              </Link>
              <Link
                href="/register"
                className="hero-cta-primary ah-btn ah-btn--sm"
              >
                הרשמה
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 md:hidden"
          aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
        >
          <Icon name={open ? "x" : "menu"} size={22} />
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100",
                  pathname === item.href && "font-semibold text-brand-700"
                )}
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
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="ah-btn ah-btn--md ah-btn--outline ah-btn--block"
                  >
                    התחברות
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="hero-cta-primary ah-btn ah-btn--md ah-btn--block"
                  >
                    הרשמה
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
