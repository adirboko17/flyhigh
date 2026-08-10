import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import {
  HeroCarouselBackground,
  HeroCarouselProvider,
} from "@/components/home/HeroCarousel";
import { BRAND } from "@/lib/constants";
import { THEME_COLOR } from "@/lib/theme-color";

const ORG = "var(--logo-orange)";

const stats = [
  ["1,200+", "ילדים מאושרים"],
  ["15+", "שנות ניסיון"],
  ["98%", "הורים ממליצים"],
] as const;

interface HeroSectionProps {
  /** כשמחוברים — קישור לאזור האישי במקום «פתיחת חשבון». */
  accountHref?: string;
}

export function HeroSection({ accountHref }: HeroSectionProps = {}) {
  const secondaryHref = accountHref ?? "/register";
  const secondaryLabel = accountHref ? "לאזור האישי" : "פתיחת חשבון";
  return (
    <section
      data-theme-color={THEME_COLOR.hero}
      className="hero-bleed-top relative overflow-hidden bg-[linear-gradient(155deg,#06314f_0%,#0a4a71_44%,#0072b8_80%,#0c97cc_100%)]"
    >
      <HeroCarouselProvider>
        <HeroCarouselBackground />

        <div className="container-page relative z-[1] flex min-h-[min(100svh,720px)] items-center justify-center pb-24 pt-28 sm:min-h-[min(92vh,780px)] sm:pb-32 sm:pt-32 lg:min-h-[min(92vh,840px)] lg:pb-36 lg:pt-32">
          <div className="relative mx-auto max-w-[560px] text-center text-white lg:max-w-[780px]">
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm sm:px-4 sm:text-[13px] lg:px-[18px] lg:text-[14px]">
              <span style={{ color: ORG }}>
                <Icon name="waves" size={16} />
              </span>
              בית הספר לשחייה ופעילות מים
            </span>

            <h1 className="mt-5 font-display text-[44px] font-extrabold leading-[1.05] tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:mt-6 sm:text-6xl sm:leading-[0.98] lg:text-[82px]">
              {BRAND.name}
            </h1>
            <p
              className="mt-3 font-display text-[21px] font-bold leading-snug sm:mt-4 sm:text-[27px] lg:text-[30px]"
              style={{
                background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              שחייה, ביטחון והנאה בגובה העיניים
            </p>

            <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/90 sm:mt-5 sm:max-w-[520px] sm:text-[17px] lg:max-w-[560px] lg:text-[18px]">
              הרשמה לחוגים, מסלולים וכניסות לבריכה בכמה קליקים. ניהול הילדים,
              ההרשמות והתשלומים - הכל במקום אחד.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-7 sm:gap-4 lg:mt-8">
              <Link
                href="/classes"
                className="hero-cta-primary ah-btn ah-btn--lg relative z-[1] lg:!h-[52px] lg:!px-9 lg:!text-[17px]"
              >
                לצפייה בחוגים
              </Link>
              <Link
                href={secondaryHref}
                className="hero-cta-glass ah-btn ah-btn--lg relative z-[1] lg:!h-[52px] lg:!px-8 lg:!text-[17px]"
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-8 sm:mt-9 lg:mt-10">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-6 lg:gap-8">
                {stats.map(([big, small], i) => (
                  <div key={small} className="flex items-center gap-5 sm:gap-6 lg:gap-8">
                    {i > 0 && (
                      <span className="hidden h-8 w-px bg-white/20 sm:block lg:h-9" />
                    )}
                    <div className="text-center">
                      <p className="font-display text-[22px] font-extrabold text-white sm:text-[26px] lg:text-[30px]">
                        {big}
                      </p>
                      <p className="text-[11.5px] text-white/70 sm:text-[12.5px] lg:text-[14px]">
                        {small}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </HeroCarouselProvider>

      <div className="absolute inset-x-0 bottom-[-1px] z-[1] leading-none">
        {/* preserveAspectRatio="none" דוחס את הגל לרוחב המסך, ולכן במובייל משתמשים בעקומה שטוחה יותר. */}
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          className="block h-[70px] w-full sm:h-[90px]"
        >
          <path
            className="sm:hidden"
            d="M0,52 C280,102 540,102 790,74 C1030,48 1240,42 1440,62 L1440,110 L0,110 Z"
            fill="var(--ink-50)"
          />
          <path
            className="hidden sm:block"
            d="M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z"
            fill="var(--ink-50)"
          />
        </svg>
      </div>
    </section>
  );
}
