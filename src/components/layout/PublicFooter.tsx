import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { BRAND, CONTACT } from "@/lib/constants";
import { THEME_COLOR } from "@/lib/theme-color";

const FOOTER_LOGO = "/images/alagova-logo-01.png";

const FOOTER_TAGLINE =
  "בית ספר לשחייה ופעילויות מים. שחייה, ביטחון והנאה – בגובה העיניים.";

const NAV_LINKS = [
  { href: "/", label: "בית" },
  { href: "/classes", label: "חוגים" },
  { href: "/programs", label: "הבריכה" },
  { href: "/contact", label: "צור קשר" },
  { href: "/register", label: "הרשמה", guestOnly: true },
  { href: "/login", label: "התחברות", guestOnly: true },
] as const;

/** קישורים משפטיים בשורה התחתונה. עמוד התקנון עדיין לא נבנה. */
const LEGAL_LINKS = [
  { href: "/accessibility", label: "הצהרת נגישות" },
  { href: "/terms", label: "תקנון" },
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
      className="-mt-px block h-10 w-full sm:h-20"
    >
      <path
        d="M0,0 H1440 V40 C1200,11 960,11 720,40 C480,69 240,69 0,40 Z"
        fill="var(--ink-50)"
      />
    </svg>
  );
}

/**
 * במובייל כל בלוק מוצג ככרטיס נפרד כדי לתחום את הרשימות הארוכות,
 * ומדסקטופ ומעלה הוא חוזר להיות עמודה שטוחה בתוך הגריד.
 */
function FooterPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-5 sm:rounded-none sm:bg-transparent sm:p-0">
      <h4 className="font-display text-sm font-bold text-white">{title}</h4>
      {children}
    </div>
  );
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: IconName;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="-mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm text-white/75 transition-colors hover:text-white sm:mx-0 sm:min-h-0 sm:px-0"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white sm:h-8 sm:w-8">
        <Icon name={icon} size={16} />
      </span>
      <span dir="ltr" className="[overflow-wrap:anywhere] text-start">
        {children}
      </span>
    </a>
  );
}

interface PublicFooterProps {
  /** קיים רק כשיש משתמש מחובר — מסתיר את קריאות ההרשמה/התחברות. */
  user?: { home: string } | null;
}

export function PublicFooter({ user = null }: PublicFooterProps) {
  const year = new Date().getFullYear();
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;
  const navLinks = NAV_LINKS.filter((link) => !("guestOnly" in link) || !user);

  return (
    <footer
      data-theme-color={THEME_COLOR.footer}
      className="mt-16 overflow-hidden text-white sm:mt-20"
      style={{ backgroundImage: FOOTER_GRADIENT }}
    >
      <FooterWaveCutout />

      <section className="container-page pb-10 pt-4 text-center sm:pb-16 sm:pt-6">
        <h2 className="font-display text-[22px] font-extrabold tracking-tight sm:text-[2rem]">
          מוכנים לקפוץ למים?
        </h2>
        <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-white/85 sm:mt-3 sm:text-base">
          {user
            ? "בוחרים את החוג המתאים ומשלימים את ההרשמה תוך דקות."
            : "פותחים חשבון, מוסיפים את הילדים ונרשמים לחוג המתאים תוך דקות."}
        </p>
        {/* במובייל הכפתורים חולקים את רוחב השורה בשווה, ומ־sm הם חוזרים לרוחב תוכן. */}
        <div className="mt-6 flex items-center justify-center gap-3 sm:mt-7">
          {user ? (
            <Link
              href="/classes"
              className="hero-cta-primary ah-btn ah-btn--lg w-full sm:w-auto"
            >
              עיון בחוגים
            </Link>
          ) : (
            <>
              <Link
                href="/classes"
                className="hero-cta-glass ah-btn ah-btn--lg flex-1 sm:flex-none"
              >
                עיון בחוגים
              </Link>
              <Link
                href="/register"
                className="hero-cta-primary ah-btn ah-btn--lg flex-1 sm:flex-none"
              >
                הרשמה עכשיו
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="container-page grid gap-4 pb-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-4">
        <div className="text-center sm:col-span-2 sm:text-start lg:col-span-1">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-90"
          >
            {/* brightness-0 invert מרנדר את הלוגו כצללית לבנה מלאה על רקע הפוטר
                הכהה, אותה גישה שמשמשת ב-BrandLogo במצב light. */}
            <Image
              src={FOOTER_LOGO}
              alt={BRAND.name}
              width={180}
              height={72}
              className="h-auto w-[150px] max-w-full object-contain brightness-0 invert sm:w-[170px]"
            />
          </Link>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70 sm:mx-0 sm:mt-4">
            {FOOTER_TAGLINE}
          </p>
        </div>

        <FooterPanel title="ניווט">
          <ul className="mt-3 grid grid-cols-2 gap-x-4 text-sm text-white/75 sm:mt-4 sm:grid-cols-1 sm:gap-y-2.5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-h-10 items-center transition-colors hover:text-white sm:min-h-0"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </FooterPanel>

        <FooterPanel title="צור קשר">
          <div className="mt-2 flex flex-col gap-1 sm:mt-4 sm:gap-3">
            <ContactRow icon="phone" href={phoneHref}>
              {CONTACT.phone}
            </ContactRow>
            <ContactRow icon="mail" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </ContactRow>
          </div>
        </FooterPanel>

        <FooterPanel title="שעות פעילות">
          <ul className="mt-3 space-y-2 text-sm text-white/75 sm:mt-4 sm:space-y-2.5">
            {CONTACT.hours.map((row) => (
              <li key={row.days} className="flex items-center justify-between gap-4">
                <span className="font-semibold text-white/90">{row.days}</span>
                <span dir="ltr">{row.time}</span>
              </li>
            ))}
          </ul>
        </FooterPanel>
      </div>

      <div className="border-t border-white/[0.08] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-5">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center text-xs text-white/55 sm:flex-row sm:text-start">
          <p>
            © {year} {BRAND.name}. כל הזכויות שמורות.
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
            {LEGAL_LINKS.map((link, index) => (
              <span key={link.href} className="flex items-center gap-x-3">
                {index > 0 && <span aria-hidden>/</span>}
                <Link
                  href={link.href}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
