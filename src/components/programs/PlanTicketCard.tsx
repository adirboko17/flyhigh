import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { cn } from "@/utils/cn";

export type PlanTicketStub =
  | { kind: "entries"; count: number }
  | { kind: "months"; count: number };

interface PlanTicketCardProps {
  name: string;
  desc: string | null;
  price: string;
  /** תווית ליד המחיר, למשל "/ לחודש". */
  period?: string;
  stub: PlanTicketStub;
  features: string[];
  icon: IconName;
  accent: string;
  featured?: boolean;
  badge?: string;
  cta?: React.ReactNode;
}

/** כרטיס מנוי/כניסה בסגנון טיקט — גוף ראשי, ניקוב וקצה תלישה. */
export function PlanTicketCard({
  name,
  desc,
  price,
  period,
  stub,
  features,
  icon,
  accent,
  featured = false,
  badge,
  cta,
}: PlanTicketCardProps) {
  const stubMeta =
    stub.kind === "entries"
      ? {
          eyebrow: stub.count === 1 ? "כניסה" : "כניסות",
          value: String(stub.count),
          unit: null as string | null,
        }
      : {
          eyebrow: "מנוי",
          value: String(stub.count),
          unit: stub.count === 1 ? "חודש" : "חודשים",
        };

  return (
    <article className="plan-ticket-shadow group relative h-full hover:-translate-y-1">
      <div
        className={cn(
          "plan-ticket relative flex h-full min-h-[300px] flex-col overflow-hidden sm:flex-row",
          featured
            ? "bg-[linear-gradient(148deg,#073552_0%,#0a5f96_52%,#0ea0c4_100%)] text-white"
            : "border border-ink-100 bg-[#fbfcfe] text-ink-900"
        )}
      >
        <div className="relative flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          {featured && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute -end-12 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(0,174,239,0.38),transparent_68%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 start-4 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.14),transparent_70%)]"
              />
            </>
          )}

          <div className="relative flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl text-white",
                featured ? "bg-white/15 ring-1 ring-white/25" : "shadow-soft"
              )}
              style={featured ? undefined : { background: accent }}
            >
              <Icon name={icon} size={20} />
            </div>

            {badge && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide",
                  featured
                    ? "bg-[var(--logo-orange)] text-[#3a2400]"
                    : "bg-amber-100 text-amber-800"
                )}
              >
                {badge}
              </span>
            )}
          </div>

          <h3
            className={cn(
              "relative mt-4 break-words font-display text-[20px] font-extrabold leading-snug sm:text-[22px]",
              featured ? "text-white" : "text-ink-900"
            )}
          >
            {name}
          </h3>

          {desc && (
            <p
              className={cn(
                "relative mt-1.5 text-sm leading-relaxed",
                featured ? "text-white/80" : "text-ink-500"
              )}
            >
              {desc}
            </p>
          )}

          <div className="relative mt-4 flex flex-wrap items-baseline gap-x-1.5">
            <p
              className={cn(
                "font-display text-[34px] font-extrabold leading-none tabular-nums sm:text-[38px]",
                featured ? "text-white" : "text-brand-700"
              )}
            >
              {price}
            </p>
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

          <ul className="relative mt-5 flex flex-1 flex-col gap-2.5">
            {features.map((feature) => (
              <li
                key={feature}
                className={cn(
                  "flex items-start gap-2 text-[13.5px] leading-snug sm:text-sm",
                  featured ? "text-white/90" : "text-ink-700"
                )}
              >
                <span
                  className="mt-0.5 shrink-0"
                  style={{
                    color: featured ? "rgba(255,255,255,0.95)" : accent,
                  }}
                >
                  <Icon name="check" size={16} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          {cta && <div className="relative mt-6">{cta}</div>}
        </div>

        {/* ניקוב — קו מקווקו בלבד; החריצים נחתכים ב־mask של .plan-ticket */}
        <div
          aria-hidden
          className="relative h-4 shrink-0 sm:h-auto sm:w-4"
        >
          <div
            className={cn(
              "absolute border-dashed",
              "start-5 end-5 top-1/2 border-t",
              "sm:start-1/2 sm:end-auto sm:top-5 sm:bottom-5 sm:w-0 sm:border-s sm:border-t-0",
              featured ? "border-white/40" : "border-ink-300"
            )}
          />
        </div>

        <div
          className={cn(
            "relative flex h-[5.5rem] shrink-0 flex-row items-center justify-between gap-4 px-5",
            "sm:h-auto sm:w-[7.5rem] sm:flex-col sm:justify-between sm:px-3 sm:py-6",
            featured ? "bg-black/20" : "bg-[#e8f0f6]"
          )}
        >
          <p
            className={cn(
              "text-[10px] font-bold tracking-[0.14em]",
              featured ? "text-white/55" : "text-ink-400"
            )}
          >
            על הגובה
          </p>

          <div className="text-center">
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.16em]",
                featured ? "text-white/55" : "text-ink-400"
              )}
            >
              {stubMeta.eyebrow}
            </p>
            <p
              className={cn(
                "mt-0.5 font-display text-4xl font-extrabold tabular-nums leading-none sm:text-[44px]",
                featured ? "text-white" : ""
              )}
              style={!featured ? { color: accent } : undefined}
            >
              {stubMeta.value}
            </p>
            {stubMeta.unit && (
              <p
                className={cn(
                  "mt-0.5 text-[11px] font-bold",
                  featured ? "text-white/70" : "text-ink-500"
                )}
              >
                {stubMeta.unit}
              </p>
            )}
          </div>

          <div
            aria-hidden
            className="flex h-7 items-end gap-[2px] sm:h-auto sm:w-7 sm:flex-col sm:items-stretch sm:justify-center sm:gap-[2px]"
          >
            {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1].map((w, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-[1px]",
                  featured ? "bg-white/50" : "bg-ink-400/65"
                )}
                style={{
                  flex: `${w} 1 0`,
                  minWidth: `${w + 1}px`,
                  minHeight: `${w + 1}px`,
                  height: "100%",
                  width: "100%",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** תאימות לשם הישן של כרטיסיות הכניסה. */
export function PoolTicketCard(
  props: Omit<PlanTicketCardProps, "stub"> & { entriesCount: number }
) {
  const { entriesCount, ...rest } = props;
  return (
    <PlanTicketCard {...rest} stub={{ kind: "entries", count: entriesCount }} />
  );
}
