import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Orb } from "@/components/home/Orb";
import { BRAND, HERO_POOL_IMAGE } from "@/lib/constants";

const MAG = "var(--logo-magenta)";
const CYN = "var(--logo-cyan)";
const ORG = "var(--logo-orange)";

const stats = [
  ["1,200+", "ילדים מאושרים"],
  ["15+", "שנות ניסיון"],
  ["98%", "הורים ממליצים"],
] as const;

interface HeroSectionProps {
  imageUrl?: string | null;
}

export function HeroSection({ imageUrl }: HeroSectionProps = {}) {
  const heroImage = imageUrl || HERO_POOL_IMAGE;
  return (
    <section className="relative -mt-20 overflow-hidden bg-[linear-gradient(155deg,#06314f_0%,#0a4a71_44%,#0072b8_80%,#0c97cc_100%)]">
      <Orb color={MAG} size={420} top={-120} left={-80} blur={90} opacity={0.35} motion="drift-a" />
      <Orb color={CYN} size={360} bottom={-40} right={-60} blur={90} opacity={0.4} motion="drift-c" />
      <Orb
        color={ORG}
        size={160}
        top={120}
        right={420}
        blur={50}
        opacity={0.45}
        motion="drift-b"
        className="hidden lg:block"
      />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_80%_0%,#fff,transparent_45%)]" />

      <div className="container-page relative grid items-center gap-12 pb-28 pt-20 sm:pb-36 sm:pt-24 lg:grid-cols-2 lg:gap-12 lg:pb-40 lg:pt-28 xl:pt-32">
        <div className="text-white">
          <span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm sm:px-4 sm:text-[13px]">
            <span style={{ color: ORG }}>
              <Icon name="waves" size={16} />
            </span>
            בית הספר לשחייה ופעילות מים
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl sm:leading-[0.98] lg:text-[72px]">
            {BRAND.name}
          </h1>
          <p
            className="mt-3.5 font-display text-xl font-bold leading-snug sm:text-[27px]"
            style={{
              background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            שחייה, ביטחון והנאה בגובה העיניים
          </p>
          <p className="mt-5 max-w-[480px] text-[15px] leading-relaxed text-white/85 sm:text-[17px]">
            הרשמה לחוגים, מסלולים וכניסות לבריכה בכמה קליקים. ניהול הילדים,
            ההרשמות והתשלומים - הכל במקום אחד.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/classes" className="hero-cta-primary ah-btn ah-btn--lg">
              לצפייה בחוגים
            </Link>
            <Link
              href="/register"
              className="text-base font-semibold text-white underline decoration-white/80 underline-offset-[6px] transition-opacity hover:opacity-90"
            >
              פתיחת חשבון
            </Link>
          </div>

          <div className="mt-9 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
            {stats.map(([big, small], i) => (
              <div key={small} className="flex items-center gap-6">
                {i > 0 && <span className="hidden h-[34px] w-px bg-white/20 sm:block" />}
                <div>
                  <p className="font-display text-xl font-extrabold text-white sm:text-[26px]">
                    {big}
                  </p>
                  <p className="text-[11.5px] text-white/70 sm:text-[12.5px]">
                    {small}
                  </p>
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
            <div className="relative h-[470px] overflow-hidden rounded-3xl bg-ink-100">
              <Image
                src={heroImage}
                alt="בריכת על הגובה"
                fill
                sizes="(max-width: 1024px) 0px, 50vw"
                className="object-cover"
                priority
              />
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
