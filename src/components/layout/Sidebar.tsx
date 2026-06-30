"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/utils/cn";
import { BrandLogo } from "./BrandLogo";

interface SidebarProps {
  items: NavItem[];
  /** תווית קטנה מתחת ללוגו (אזור ניהול / אזור מדריכה). */
  area: string;
}

export function Sidebar({ items, area }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/admin" &&
      href !== "/instructor" &&
      pathname.startsWith(href + "/")) ||
    (pathname.startsWith(href) && href.split("/").length > 2);

  return (
    <>
      {/* פס עליון למובייל */}
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3 lg:hidden">
        <BrandMark area={area} />
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
          aria-label="תפריט"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-72 transform border-l border-ink-100 bg-white transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="hidden border-b border-ink-100 px-6 py-5 lg:block">
          <BrandMark area={area} />
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(item.href);
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

function BrandMark({ area }: { area: string }) {
  return <BrandLogo height={40} subtitle={area} />;
}
