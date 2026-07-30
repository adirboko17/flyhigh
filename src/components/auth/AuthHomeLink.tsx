import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export function AuthHomeLink() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-full border border-ink-100 bg-white px-2.5 py-2 pe-4 text-sm font-bold text-ink-700 shadow-none transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 sm:shadow-[0_8px_24px_-14px_rgba(10,74,113,0.45)] sm:hover:shadow-[0_12px_28px_-14px_rgba(2,163,240,0.5)]"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-l from-brand-500 to-aqua-500 text-white shadow-none transition-transform duration-300 group-hover:scale-105 sm:shadow-sm">
        <Icon
          name="arrow"
          size={16}
          stroke={2}
          className="rotate-180 transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </span>
      <span>חזרה לדף הבית</span>
    </Link>
  );
}
