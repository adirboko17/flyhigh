import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { THEME_COLOR } from "@/lib/theme-color";

export function AnnouncementBar() {
  return (
    <aside
      aria-label="הטבה מיוחדת למשפחות"
      data-theme-color={THEME_COLOR.surface}
      className="sticky top-0 z-[60] overflow-hidden border-b border-brand-100/80 bg-white pt-[env(safe-area-inset-top,0px)] text-ink-700 sm:relative sm:top-auto"
    >
      <div
        className="announcement-marquee min-h-9 py-1.5 text-xs sm:hidden"
        role="note"
        aria-label="5% הנחת משפחה בהרשמה לשני בני משפחה"
      >
        <div className="announcement-marquee__track">
          {Array.from({ length: 3 }, (_, groupIndex) => (
            <div
              key={groupIndex}
              className="announcement-marquee__group"
              aria-hidden
            >
              {Array.from({ length: 4 }, (_, itemIndex) => (
                <span
                  key={itemIndex}
                  className="announcement-marquee__item"
                  dir="rtl"
                >
                  <Icon name="users" size={14} stroke={2} />
                  <strong>5% הנחת משפחה</strong>
                  <span className="text-ink-300">•</span>
                  בהרשמה לשני בני משפחה
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="container-page relative hidden min-h-9 items-center justify-center gap-2 py-1.5 text-center text-sm sm:flex">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon name="users" size={14} stroke={2} />
        </span>
        <p className="leading-5">
          <strong className="font-extrabold text-brand-700">5% הנחת משפחה</strong>
          <span className="mx-1 text-ink-300" aria-hidden>
            •
          </span>
          בהרשמה לשני בני משפחה
        </p>
        <Link
          href="/programs"
          className="whitespace-nowrap font-bold text-brand-600 underline decoration-brand-200 underline-offset-4 transition-colors hover:text-brand-800"
        >
          לבריכה
        </Link>
      </div>
    </aside>
  );
}
