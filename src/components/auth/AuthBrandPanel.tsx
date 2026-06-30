import { Icon } from "@/components/icons/Icon";
import { Orb } from "@/components/home/Orb";

const MAG = "var(--logo-magenta)";
const CYN = "var(--logo-cyan)";
const ORG = "var(--logo-orange)";

interface AuthBrandPanelProps {
  heading?: string;
  points: string[];
}

export function AuthBrandPanel({
  heading = "שחייה, ביטחון והנאה - בגובה העיניים",
  points,
}: AuthBrandPanelProps) {
  return (
    <div className="relative hidden min-h-screen flex-col justify-center self-start overflow-hidden bg-[linear-gradient(160deg,#06314f_0%,#0a4a71_50%,#0072b8_100%)] px-14 py-16 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen">
      <Orb color={MAG} size={360} top={-110} left={-70} blur={90} opacity={0.32} />
      <Orb color={CYN} size={320} bottom={-60} right={-60} blur={90} opacity={0.36} />
      <Orb color={ORG} size={140} top={120} right={90} blur={50} opacity={0.4} />

      <div className="relative max-w-[440px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-semibold backdrop-blur-sm">
          <span style={{ color: ORG }}>
            <Icon name="waves" size={16} />
          </span>
          בית הספר לשחייה ופעילות מים
        </span>

        <h2 className="mt-5 font-display text-[52px] font-extrabold leading-[0.98] tracking-tight">
          על הגובה
        </h2>
        <p
          className="mt-3 font-display text-[22px] font-bold leading-snug"
          style={{
            background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {heading}
        </p>

        <ul className="mt-7 flex list-none flex-col gap-3.5 p-0">
          {points.map((text) => (
            <li
              key={text}
              className="flex items-start gap-3 text-[15.5px] text-white/90"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <Icon name="check" size={15} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <span
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#3a2400]"
            style={{ background: ORG }}
          >
            <Icon name="shield" size={18} />
          </span>
          <div>
            <p className="font-display text-[15px] font-extrabold">98% הורים ממליצים</p>
            <p className="text-[12.5px] text-white/70">מדריכות מוסמכות · יחס אישי</p>
          </div>
        </div>
      </div>
    </div>
  );
}
