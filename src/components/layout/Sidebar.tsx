"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABEL } from "@/lib/constants";
import type { NavItem } from "@/lib/navigation";
import type { Profile } from "@/lib/auth";
import { cn } from "@/utils/cn";
import { BrandLogo } from "./BrandLogo";
import { LogoutButton } from "./LogoutButton";

interface SidebarProps {
  items: NavItem[];
  /** תווית קטנה ליד הלוגו (אופציונלי). */
  area?: string;
  /** לוגו מותאם לסרגל (ברירת מחדל: alagova-logo.png) */
  logoSrc?: string;
  logoHeight?: number;
  logoWidth?: number;
  logoHref?: string;
  profile: Pick<Profile, "full_name" | "role">;
}

export function Sidebar({
  items,
  area,
  logoSrc,
  logoHeight,
  logoWidth,
  logoHref,
  profile,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // נעילת גלילת הרקע כשהמגירה פתוחה במובייל, אחרת התוכן זז מתחת לשכבת הכיסוי.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // סגירת המגירה במעבר בין עמודים, כדי שהיא לא תישאר פתוחה מעל התוכן החדש.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const matchesPath = (href: string) =>
    href === pathname ||
    (href !== "/admin" &&
      href !== "/instructor" &&
      pathname.startsWith(href + "/")) ||
    (pathname.startsWith(href) && href.split("/").length > 2);

  const isActive = (item: NavItem) =>
    matchesPath(item.href) || (item.matchPaths ?? []).some(matchesPath);

  return (
    <>
      {/* פס עליון למובייל — דביק בגלילה, לוגו במרכז, תפריט מימין (RTL: start) */}
      <div className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-center border-b border-ink-100/80 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90 lg:hidden">
        <BrandMark
          logoSrc={logoSrc}
          logoHeight={40}
          logoWidth={logoWidth ? 130 : undefined}
          logoHref={logoHref}
        />
        {/* ריווח סימטרי משמאל כדי שהלוגו יישאר ממורכז ויזואלית */}
        <div aria-hidden className="pointer-events-none absolute end-4 h-10 w-10" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute start-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100"
          aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
          aria-expanded={open}
        >
          <Icon name={open ? "x" : "menu"} size={22} />
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex w-[17rem] max-w-[85vw] transform flex-col border-e border-ink-100 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:max-w-none lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="hidden border-b border-ink-100 px-6 py-5 lg:flex lg:justify-center">
          <BrandMark
          area={area}
          logoSrc={logoSrc}
          logoHeight={logoHeight}
          logoWidth={logoWidth}
          logoHref={logoHref}
        />
        </div>

        {/* כותרת המגירה — מובייל בלבד */}
        <div className="shrink-0 border-b border-ink-100/80 bg-gradient-to-b from-ink-50/70 to-white px-5 pb-4 pt-5 lg:hidden">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-4 w-0.5 shrink-0 rounded-full bg-brand-gradient"
            />
            <div>
              <p className="font-display text-[15px] font-bold tracking-tight text-ink-800">
                תפריט
              </p>
              {area && (
                <p className="mt-0.5 text-xs font-medium text-ink-400">{area}</p>
              )}
            </div>
          </div>
        </div>

        <nav
          aria-label="תפריט ניווט"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 lg:pt-3"
        >
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-brand-gradient text-white shadow-glow"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <SidebarUser profile={profile} />
      </aside>

      {open && (
        <button
          aria-label="סגירת תפריט"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
        />
      )}
    </>
  );
}

function SidebarUser({
  profile,
}: {
  profile: Pick<Profile, "full_name" | "role">;
}) {
  return (
    <div className="mt-auto border-t border-ink-100 bg-ink-50/60 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-soft">
        <Avatar name={profile.full_name} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-800">
            {profile.full_name}
          </p>
          <p className="text-xs text-ink-400">{ROLE_LABEL[profile.role]}</p>
        </div>
      </div>
      <LogoutButton className="mt-2.5 w-full justify-center rounded-xl border border-ink-100 bg-white" />
    </div>
  );
}

function BrandMark({
  area,
  logoSrc,
  logoHeight,
  logoWidth,
  logoHref,
}: {
  area?: string;
  logoSrc?: string;
  logoHeight?: number;
  logoWidth?: number;
  logoHref?: string;
}) {
  return (
    <BrandLogo
      src={logoSrc}
      height={logoHeight ?? 40}
      width={logoWidth}
      subtitle={area}
      href={logoHref}
    />
  );
}
