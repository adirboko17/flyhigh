import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { Orb } from "@/components/home/Orb";
import { cn } from "@/utils/cn";

const MAG = "var(--logo-magenta)";

interface PlanCardProps {
  name: string;
  desc: string | null;
  price: string;
  period?: string;
  features: string[];
  icon: IconName;
  accent: string;
  featured?: boolean;
  badge?: string;
}

export function PlanCard({
  name,
  desc,
  price,
  period,
  features,
  icon,
  accent,
  featured = false,
  badge,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "feat-card relative flex flex-col overflow-hidden rounded-[26px] p-[30px] transition-all duration-300",
        featured
          ? "bg-[linear-gradient(150deg,#0a4a71_0%,#0072b8_55%,#0c97cc_100%)] text-white shadow-[0_26px_54px_-24px_rgba(10,74,113,0.6)]"
          : "border border-ink-100 bg-white shadow-card"
      )}
    >
      {featured && (
        <Orb color={MAG} size={200} top={-80} left={-40} blur={60} opacity={0.45} />
      )}

      {badge && (
        <span
          className={cn(
            "absolute end-[18px] top-[18px] rounded-full px-3 py-1 text-xs font-extrabold",
            featured ? "bg-[var(--logo-orange)] text-[#3a2400]" : "bg-brand-100 text-brand-700"
          )}
        >
          {badge}
        </span>
      )}

      <div className="relative flex flex-1 flex-col">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[14px] text-white"
          style={{
            background: featured ? "rgba(255,255,255,0.16)" : accent,
            boxShadow: featured ? undefined : `0 12px 26px -10px ${accent}`,
          }}
        >
          <Icon name={icon} size={22} />
        </div>

        <h3
          className={cn(
            "mt-[18px] font-display text-[21px] font-extrabold",
            featured ? "text-white" : "text-ink-900"
          )}
        >
          {name}
        </h3>

        {desc && (
          <p
            className={cn(
              "mt-1 text-sm leading-relaxed",
              featured ? "text-white/82" : "text-ink-500"
            )}
          >
            {desc}
          </p>
        )}

        <div className="mt-5 flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-[42px] font-extrabold leading-none",
              featured ? "text-white" : "text-brand-700"
            )}
          >
            {price}
          </span>
          {period && (
            <span
              className={cn(
                "text-sm font-semibold",
                featured ? "text-white/75" : "text-ink-400"
              )}
            >
              {period}
            </span>
          )}
        </div>

        <div
          className={cn(
            "my-[22px] h-px",
            featured ? "bg-white/18" : "bg-ink-100"
          )}
        />

        <ul className="flex flex-1 flex-col gap-3 p-0">
          {features.map((feature) => (
            <li
              key={feature}
              className={cn(
                "flex items-start gap-2.5 text-[14.5px]",
                featured ? "text-white/92" : "text-ink-700"
              )}
            >
              <span
                className="mt-0.5 shrink-0"
                style={{ color: featured ? "rgba(255,255,255,0.95)" : accent }}
              >
                <Icon name="check" size={17} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-[26px]">
          {featured ? (
            <Link
              href="/register"
              className="ah-btn ah-btn--lg ah-btn--block bg-white text-brand-700 hover:bg-white/95"
            >
              הצטרפות למסלול
            </Link>
          ) : (
            <Link href="/register" className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block">
              הצטרפות למסלול
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
