import Image from "next/image";
import Link from "next/link";
import { BRAND, CONTACT } from "@/lib/constants";

const FOOTER_LOGO = "/images/alagova-logo-01.png";

const FOOTER_TAGLINE =
  "בית ספר לשחייה ופעילויות מים. שחייה, ביטחון והנאה – בגובה העיניים.";

const NAV_LINKS = [
  { href: "/", label: "בית" },
  { href: "/classes", label: "חוגים" },
  { href: "/programs", label: "מסלולים" },
  { href: "/contact", label: "צור קשר" },
  { href: "/register", label: "הרשמה" },
  { href: "/login", label: "התחברות" },
  { href: "/accessibility", label: "הצהרת נגישות" },
] as const;

const FOOTER_GRADIENT =
  "linear-gradient(110deg, #2c2054 0%, #1b3164 40%, #10456f 70%, #0d5285 100%)";

/**
 * הגל נחתך מתוך רקע הפוטר בעזרת צורה בצבע רקע העמוד, כדי שהגרדיאנט יימשך
 * ברצף ולא ייווצר תפר בין הגל לגוף הפוטר. ה־‎-mt-px מכסה את שורת הפיקסל
 * העליונה של הפוטר, שאחרת נחשפת כקו דק בגלל עיגול תת-פיקסלי.
 */
function FooterWaveCutout() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className="-mt-px block h-14 w-full sm:h-20"
    >
      <path
        d="M0,0 H1440 V40 C1200,11 960,11 720,40 C480,69 240,69 0,40 Z"
        fill="var(--ink-50)"
      />
    </svg>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-20 overflow-hidden text-white"
      style={{ backgroundImage: FOOTER_GRADIENT }}
    >
      <FooterWaveCutout />

      <section className="container-page px-4 pb-14 pt-6 text-center sm:px-6 sm:pb-16 lg:px-8">
        <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-[2rem]">
          מוכנים לקפוץ למים?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
          פותחים חשבון, מוסיפים את הילדים ונרשמים לחוג המתאים תוך דקות.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/classes" className="hero-cta-glass ah-btn ah-btn--lg">
            עיון בחוגים
          </Link>
          <Link href="/register" className="hero-cta-primary ah-btn ah-btn--lg">
            הרשמה עכשיו
          </Link>
        </div>
      </section>

      <div>
        <div className="container-page grid gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90"
            >
              <Image
                src={FOOTER_LOGO}
                alt={BRAND.name}
                width={180}
                height={72}
                className="h-auto w-[170px] max-w-full object-contain"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {FOOTER_TAGLINE}
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-white">ניווט</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-white">
              צור קשר
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>
                <a
                  href={`tel:${CONTACT.phone}`}
                  dir="ltr"
                  className="transition-colors hover:text-white"
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  dir="ltr"
                  className="[overflow-wrap:anywhere] transition-colors hover:text-white"
                >
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-white">
              שעות פעילות
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              {CONTACT.hours.map((row) => (
                <li key={row.days}>
                  {row.days}: {row.time}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] py-5">
        <div className="container-page flex flex-col items-center justify-between gap-3 px-4 text-center text-xs text-white/55 sm:flex-row sm:px-6 sm:text-start lg:px-8">
          <p>
            © {year} {BRAND.name}. כל הזכויות שמורות.
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            <Link href="/login" className="transition-colors hover:text-white">
              התחברות
            </Link>
            <span aria-hidden>/</span>
            <Link
              href="/register"
              className="transition-colors hover:text-white"
            >
              הרשמה
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
