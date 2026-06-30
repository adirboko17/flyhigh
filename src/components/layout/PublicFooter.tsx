import Link from "next/link";
import { BRAND } from "@/lib/constants";

export function PublicFooter() {
  return (
    <footer id="contact" className="mt-20 border-t border-ink-100 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-lg font-extrabold text-white">
              ע
            </span>
            <span className="font-display text-lg font-extrabold text-ink-900">
              {BRAND.name}
            </span>
          </div>
          <p className="mt-3 text-sm text-ink-500">{BRAND.tagline}</p>
        </div>

        <div>
          <h4 className="font-display text-sm font-bold text-ink-800">ניווט</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/" className="hover:text-brand-600">בית</Link></li>
            <li><Link href="/classes" className="hover:text-brand-600">חוגים</Link></li>
            <li><Link href="/register" className="hover:text-brand-600">הרשמה</Link></li>
            <li><Link href="/login" className="hover:text-brand-600">התחברות</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-bold text-ink-800">צור קשר</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>טלפון: {BRAND.phone}</li>
            <li>דוא״ל: {BRAND.email}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-bold text-ink-800">שעות פעילות</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>א׳–ה׳: 08:00–21:00</li>
            <li>ו׳: 08:00–14:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} {BRAND.name}. כל הזכויות שמורות.
      </div>
    </footer>
  );
}
