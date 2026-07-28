"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
      {/* פס עליון למובייל */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <BrandMark
          area={area}
          logoSrc={logoSrc}
          logoHeight={logoHeight}
          logoWidth={logoWidth}
          logoHref={logoHref}
        />
        <div className="flex items-center gap-2">
          <Avatar name={profile.full_name} className="h-8 w-8 text-xs" />
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
            aria-label="תפריט"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 inset-inline-start-0 z-40 flex w-72 transform flex-col border-e border-ink-100 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
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

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
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
