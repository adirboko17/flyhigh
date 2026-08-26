import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { BRAND, CONTACT } from "@/lib/constants";
import { THEME_COLOR } from "@/lib/theme-color";

const FOOTER_LOGO = "/images/alagova-logo-01.png";

const FOOTER_TAGLINE =
  "מרכז ספורט וכושר. כושר, שחייה והנאה – בגובה העיניים.";

const MOBILE_BRAND_TAGLINE = "כושר, שחייה והנאה בגובה העיניים";

/** ניווט פוטר — רק לינקים ציבוריים מרכזיים. */
const NAV_LINKS = [
  { href: "/", label: "בית" },
  { href: "/classes", label: "חוגים" },
  { href: "/programs", label: "הבריכה" },
  { href: "/contact", label: "צור קשר" },
  { href: "/terms", label: "תקנון" },
] as const;

/** גרדיאנט כחול־עמוק בסגנון ההירו — מותג אחד מקצה לקצה. */
const FOOTER_GRADIENT =
  "linear-gradient(155deg, #06314f 0%, #0a4a71 42%, #0072b8 78%, #0c97cc 100%)";

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

function FooterPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="font-display text-[13px] font-bold uppercase tracking-wide text-white/90 sm:text-sm sm:normal-case sm:tracking-normal sm:text-white lg:text-[13px] lg:uppercase lg:tracking-wide lg:text-white/90">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ContactRow({
  icon,
  href,
  ltr = false,
  children,
}: {
  icon: IconName;
  href?: string;
  ltr?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-white sm:h-8 sm:w-8 sm:bg-white/10 lg:h-9 lg:w-9">
        <Icon name={icon} size={16} />
      </span>
      <span
        dir={ltr ? "ltr" : undefined}
        className="[overflow-wrap:anywhere] text-start"
      >
        {children}
      </span>
    </>
  );

  const className =
    "flex min-h-12 items-center gap-3 rounded-2xl bg-white/[0.07] px-3.5 text-sm text-white/80 transition-colors sm:min-h-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:text-white/75 lg:gap-3.5 lg:min-h-0";

  if (href) {
    return (
      <a
        href={href}
        className={`${className} active:bg-white/[0.12] sm:hover:text-white`}
      >
        {content}
      </a>
    );
  }

  return <p className={className}>{content}</p>;
}

interface PublicFooterProps {
  /** קיים רק כשיש משתמש מחובר — משנה את טקסט/כפתורי ה-CTA. */
  user?: { home: string } | null;
}

export function PublicFooter({ user = null }: PublicFooterProps) {
  const year = new Date().getFullYear();
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`;

  return (
    <footer
      data-theme-color={THEME_COLOR.footer}
      className="mt-16 overflow-hidden text-white sm:mt-20"
      style={{ backgroundImage: FOOTER_GRADIENT }}
    >
      <FooterWaveCutout />

      {/* CTA */}
      <section className="container-page pb-7 pt-3 text-center sm:pb-10 sm:pt-5 lg:pb-11 lg:pt-4">
        <h2 className="font-display text-[1.55rem] font-extrabold leading-tight tracking-tight sm:text-[1.75rem] lg:text-[1.85rem]">
          מוכנים לקפוץ למים?
        </h2>
        <p className="mx-auto mt-2 max-w-[20rem] text-[14px] leading-relaxed text-white/85 sm:mt-2.5 sm:max-w-xl sm:text-[15px] lg:max-w-lg">
          {user
            ? "בוחרים את החוג המתאים ומשלימים את ההרשמה תוך דקות."
            : "פותחים חשבון, מוסיפים את הילדים ונרשמים לחוג המתאים תוך דקות."}
        </p>
        <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-center sm:gap-3 lg:mt-6">
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
                href="/register"
                className="hero-cta-primary ah-btn ah-btn--lg w-full sm:w-auto sm:flex-none"
              >
                הרשמה עכשיו
              </Link>
              <Link
                href="/classes"
                className="hero-cta-glass ah-btn ah-btn--lg w-full sm:w-auto sm:flex-none"
              >
                עיון בחוגים
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="container-page border-t border-white/10 pb-9 pt-7 sm:py-11 lg:pb-12 lg:pt-12">
        {/* מותג — ממורכז במובייל */}
        <div className="mb-7 flex flex-col items-center text-center sm:mb-0 sm:hidden">
          <Link href="/" className="transition-opacity active:opacity-80">
            <Image
              src={FOOTER_LOGO}
              alt={BRAND.name}
              width={96}
              height={48}
              className="h-11 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="mt-3 font-display text-[1.65rem] font-extrabold leading-none tracking-tight text-white">
            {BRAND.name}
          </p>
          <p className="mt-2 max-w-[16rem] text-[13.5px] font-medium leading-snug text-white/70">
            {MOBILE_BRAND_TAGLINE}
          </p>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="hidden text-center sm:col-span-2 sm:block sm:text-start lg:col-span-1">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90"
            >
              <Image
                src={FOOTER_LOGO}
                alt={BRAND.name}
                width={200}
                height={80}
                className="h-auto w-[150px] max-w-full object-contain brightness-0 invert sm:w-[170px] lg:w-[188px]"
              />
            </Link>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70 sm:mx-0 sm:mt-4 lg:mt-5 lg:text-[14.5px] lg:leading-[1.7]">
              {FOOTER_TAGLINE}
            </p>
          </div>

          <FooterPanel title="ניווט">
            <ul className="mt-3.5 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-1 sm:gap-y-2.5 lg:mt-5 lg:gap-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-11 items-center justify-center rounded-xl bg-white/[0.07] px-3 text-sm font-medium text-white/85 transition-colors active:bg-white/[0.12] sm:min-h-0 sm:justify-start sm:rounded-none sm:bg-transparent sm:px-0 sm:font-normal sm:text-white/75 sm:hover:text-white lg:underline-offset-4 lg:hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterPanel>

          <FooterPanel title="צור קשר">
            <div className="mt-3.5 flex flex-col gap-2 sm:mt-4 sm:gap-3 lg:mt-5 lg:gap-3.5">
              <ContactRow icon="phone" href={phoneHref} ltr>
                {CONTACT.phone}
              </ContactRow>
              <ContactRow icon="mail" href={`mailto:${CONTACT.email}`} ltr>
                {CONTACT.email}
              </ContactRow>
              <ContactRow icon="pin">{CONTACT.address}</ContactRow>
            </div>
          </FooterPanel>
        </div>
      </div>

      <div className="border-t border-white/10 pb-[calc(1.35rem+env(safe-area-inset-bottom,0px))] pt-5 lg:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] lg:pt-6">
        <div className="container-page flex flex-col items-center gap-2.5 text-center text-[12px] text-white/55 sm:flex-row sm:justify-between sm:gap-3 sm:text-start sm:text-xs lg:text-[13px] lg:text-white/60">
          <p>
            © {year} {BRAND.name}. כל הזכויות שמורות.
          </p>
          <Link
            href="/accessibility"
            className="transition-colors hover:text-white active:text-white"
          >
            הצהרת נגישות
          </Link>
        </div>
      </div>
    </footer>
  );
}
