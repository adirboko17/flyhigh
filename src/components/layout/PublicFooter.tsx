import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/constants";

const FOOTER_LOGO = "/images/alagova-logo-01.png";

export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <Image
              src={FOOTER_LOGO}
              alt={BRAND.name}
              width={180}
              height={72}
              className="h-auto w-[170px] max-w-full object-contain"
            />
          </Link>
        </div>

        <div>
          <h4 className="font-display text-sm font-bold text-ink-800">ניווט</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/" className="hover:text-brand-600">בית</Link></li>
            <li><Link href="/classes" className="hover:text-brand-600">חוגים</Link></li>
            <li><Link href="/programs" className="hover:text-brand-600">מסלולים</Link></li>
            <li><Link href="/contact" className="hover:text-brand-600">צור קשר</Link></li>
            <li><Link href="/register" className="hover:text-brand-600">הרשמה</Link></li>
            <li><Link href="/login" className="hover:text-brand-600">התחברות</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-bold text-ink-800">צור קשר</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>טלפון: {BRAND.phone}</li>
            <li className="[overflow-wrap:anywhere]">דוא״ל: {BRAND.email}</li>
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
