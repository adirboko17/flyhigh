"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABEL } from "@/lib/constants";
import type { NavItem } from "@/lib/navigation";
import type { Profile } from "@/lib/auth";
import { THEME_COLOR } from "@/lib/theme-color";
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
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

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
    setNavigatingTo(null);
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
      {navigatingTo && (
        <div
          className="fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-[200] h-1 overflow-hidden bg-brand-100"
          role="progressbar"
          aria-label="טוען את העמוד הבא"
        >
          <span className="admin-route-progress block h-full bg-brand-gradient" />
        </div>
      )}

      {/* פס עליון למובייל — דביק בגלילה, לוגו במרכז, תפריט מימין (RTL: start) */}
      <div
        data-theme-color={THEME_COLOR.transparent}
        className="sticky top-0 z-50 flex w-full shrink-0 items-center justify-center border-b border-ink-100/80 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-sm lg:hidden"
      >
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
          "fixed inset-x-0 top-0 z-[70] flex h-[100svh] w-full max-w-none transform flex-col overflow-hidden bg-transparent transition-transform duration-300 lg:visible lg:sticky lg:top-0 lg:z-40 lg:h-screen lg:w-72 lg:max-w-none lg:border-e lg:border-ink-100 lg:bg-white lg:translate-x-0",
          open
            ? "visible translate-x-0"
            : "invisible pointer-events-none translate-x-full lg:pointer-events-auto lg:translate-x-0"
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
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-ink-100 bg-white px-6 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] lg:hidden">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-4 w-0.5 shrink-0 rounded-full bg-brand-gradient"
            />
            <div>
              <p className="font-display text-[17px] font-extrabold tracking-tight text-ink-900">
                תפריט
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                {area ?? "לאן תרצו להגיע?"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגירת תפריט"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-500 shadow-sm transition-colors active:bg-ink-50 active:text-ink-800"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <nav
          aria-label="תפריט ניווט"
          className="flex flex-1 flex-col gap-1 overflow-y-auto bg-white p-3 lg:pt-3"
        >
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                // עמודי ניהול דינמיים וכבדים — prefetch ב-hover טוען כמה מסכים במקביל ומאט הכל.
                prefetch={false}
                onClick={() => {
                  setOpen(false);
                  if (item.href !== pathname) setNavigatingTo(item.href);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-5 py-4 text-lg font-semibold transition-all lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-sm lg:font-medium",
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
    </>
  );
}

function SidebarUser({
  profile,
}: {
  profile: Pick<Profile, "full_name" | "role">;
}) {
  return (
    <div className="mb-[env(safe-area-inset-bottom,0px)] mt-auto border-t border-ink-100 bg-ink-50/60 p-4 lg:mb-0">
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
