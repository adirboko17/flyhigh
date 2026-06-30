import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Orb } from "@/components/home/Orb";

const MAG = "var(--logo-magenta)";
const ORG = "var(--logo-orange)";

export function CtaSection() {
  return (
    <section className="container-page pb-[72px]">
      <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(120deg,#0a4a71_0%,#0072b8_60%,#0c97cc_100%)] px-8 py-14 text-center text-white shadow-[0_30px_60px_-28px_rgba(10,74,113,0.6)]">
        <Orb color={MAG} size={260} top={-90} right={-40} blur={70} opacity={0.4} />
        <Orb color={ORG} size={150} bottom={-50} left={60} blur={50} opacity={0.5} />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-1.5 text-[13px] font-semibold backdrop-blur-sm">
            <span style={{ color: ORG }}>
              <Icon name="drop" size={15} />
            </span>
            הצטרפו אלינו
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-[40px]">
            מוכנים לקפוץ למים?
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[17px] text-white/88">
            פתחו חשבון, הוסיפו את הילדים שלכם והירשמו לחוג המתאים תוך דקות.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="hero-cta-primary ah-btn ah-btn--lg">
              הרשמה עכשיו →
            </Link>
            <Link href="/classes" className="hero-cta-glass ah-btn ah-btn--lg">
              עיון בחוגים
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
