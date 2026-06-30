import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Orb } from "@/components/home/Orb";
import { BRAND } from "@/lib/constants";

const MAG = "var(--logo-magenta)";
const CYN = "var(--logo-cyan)";
const ORG = "var(--logo-orange)";

const stats = [
  ["1,200+", "ילדים מאושרים"],
  ["15+", "שנות ניסיון"],
  ["98%", "הורים ממליצים"],
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(155deg,#06314f_0%,#0a4a71_44%,#0072b8_80%,#0c97cc_100%)]">
      <Orb color={MAG} size={420} top={-120} left={-80} blur={90} opacity={0.35} />
      <Orb color={CYN} size={360} bottom={-40} right={-60} blur={90} opacity={0.4} />
      <Orb color={ORG} size={160} top={120} right={420} blur={50} opacity={0.45} />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_80%_0%,#fff,transparent_45%)]" />

      <div className="container-page relative grid items-center gap-12 pb-44 pt-16 lg:grid-cols-2 lg:gap-12 lg:pb-40 lg:pt-20 xl:pt-[84px]">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-semibold backdrop-blur-sm">
            <span style={{ color: ORG }}>
              <Icon name="waves" size={16} />
            </span>
            בית הספר לשחייה ופעילות מים
          </span>

          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[72px]">
            {BRAND.name}
          </h1>
          <p
            className="mt-3.5 font-display text-2xl font-bold leading-snug sm:text-[27px]"
            style={{
              background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            שחייה, ביטחון והנאה
            <br />
            בגובה העיניים
          </p>
          <p className="mt-5 max-w-[480px] text-[17px] leading-relaxed text-white/85">
            הרשמה לחוגים, מסלולים וכניסות לבריכה בכמה קליקים. ניהול הילדים,
            ההרשמות והתשלומים — הכל במקום אחד.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="hero-cta-primary ah-btn ah-btn--lg">
              פתיחת חשבון →
            </Link>
            <Link href="/classes" className="hero-cta-glass ah-btn ah-btn--lg">
              לצפייה בחוגים
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            {stats.map(([big, small], i) => (
              <div key={small} className="flex items-center gap-6">
                {i > 0 && <span className="hidden h-[34px] w-px bg-white/20 sm:block" />}
                <div>
                  <p className="font-display text-[26px] font-extrabold text-white">
                    {big}
                  </p>
                  <p className="text-[12.5px] text-white/70">{small}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div
            className="absolute -end-[18px] -top-[18px] z-[2] h-[132px] w-[132px] rounded-full border-[10px] opacity-90"
            style={{ borderColor: ORG }}
          />
          <div
            className="absolute -start-9 bottom-[70px] h-[120px] w-[120px] rounded-full blur-md"
            style={{ background: MAG, opacity: 0.25 }}
          />
          <div className="relative rounded-[32px] border border-white/20 bg-white/10 p-2.5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            <div className="flex h-[470px] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700/80 via-brand-500/60 to-aqua-400/50">
              <div className="text-center text-white/90">
                <Icon name="waves" size={64} className="mx-auto opacity-80" />
                <p className="mt-4 text-sm font-medium">בריכת על הגובה</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-[-26px] end-6 z-[3] flex items-center gap-3 rounded-[18px] bg-white px-4 py-3 shadow-[0_18px_40px_-16px_rgba(16,42,75,0.45)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aqua-100 text-aqua-600">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <p className="font-display text-base font-extrabold text-ink-900">
                98% הורים ממליצים
              </p>
              <p className="text-xs text-ink-500">מדריכות מוסמכות · יחס אישי</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[-1px] leading-none">
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          className="block h-[90px] w-full"
        >
          <path
            d="M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z"
            fill="var(--ink-50)"
          />
        </svg>
      </div>
    </section>
  );
}
