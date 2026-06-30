import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Orb } from "@/components/home/Orb";
import type { IconName } from "@/components/icons/paths";
import { cn } from "@/utils/cn";

const MAG = "var(--logo-magenta)";
const CYN = "var(--logo-cyan)";
const ORG = "var(--logo-orange)";

interface PublicPageHeroProps {
  badgeIcon: IconName;
  badgeIconColor?: string;
  badgeText: string;
  title: string;
  description: string;
  backLink?: { href: string; label: string };
  /** מיקום קישור חזרה — ברירת מחדל למעלה */
  backLinkPlacement?: "top" | "below-description";
  size?: "default" | "compact";
}

export function PublicPageHero({
  badgeIcon,
  badgeIconColor = ORG,
  badgeText,
  title,
  description,
  backLink,
  backLinkPlacement = "top",
  size = "default",
}: PublicPageHeroProps) {
  const compact = size === "compact";

  const backLinkEl = backLink ? (
    <Link
      href={backLink.href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white",
        backLinkPlacement === "below-description" &&
          "underline decoration-white/90 underline-offset-4"
      )}
    >
      {backLink.label}
    </Link>
  ) : null;

  return (
    <section className="relative -mt-20 overflow-hidden bg-[linear-gradient(155deg,#06314f_0%,#0a4a71_48%,#0072b8_100%)]">
      <Orb color={MAG} size={340} top={-120} right={-60} blur={90} opacity={0.32} motion="drift-a" />
      <Orb color={CYN} size={300} bottom={-40} left={-50} blur={90} opacity={0.36} motion="drift-c" />
      <Orb color={ORG} size={130} top={70} left={360} blur={50} opacity={0.4} motion="drift-b" />

      <div
        className={cn(
          "container-page relative text-center text-white",
          compact ? "pb-20 pt-24 lg:pt-28" : "pb-[130px] pt-28 lg:pt-32"
        )}
      >
        {backLink && backLinkPlacement === "top" && (
          <div className="mb-6 text-start">{backLinkEl}</div>
        )}
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-semibold backdrop-blur-sm">
          <span style={{ color: badgeIconColor }}>
            <Icon name={badgeIcon} size={16} />
          </span>
          {badgeText}
        </span>
        <h1
          className={cn(
            "mt-4 font-display font-extrabold leading-tight tracking-tight",
            compact ? "text-3xl sm:text-4xl" : "mt-5 text-4xl sm:text-[50px]"
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "mx-auto max-w-[560px] leading-relaxed text-white/85",
            compact ? "mt-2.5 text-base" : "mt-3.5 text-[17px]"
          )}
        >
          {description}
        </p>
        {backLink && backLinkPlacement === "below-description" && (
          <div className="mt-4">{backLinkEl}</div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-[-1px] leading-none">
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          className={cn("block w-full", compact ? "h-[60px]" : "h-[90px]")}
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
