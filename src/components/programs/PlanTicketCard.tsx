import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { CollapsiblePriceRows } from "@/components/programs/CollapsiblePriceRows";
import { cn } from "@/utils/cn";

export type PlanTicketStub =
  | { kind: "entries"; count: number }
  | { kind: "months"; count: number }
  | { kind: "minutes"; count: number }
  | {
      kind: "people";
      label?: string;
      eyebrow?: string;
      value?: string;
      unit?: string;
    };

export type PlanPriceRow = {
  range: string;
  price: string;
  note?: string | null;
};

interface PlanTicketCardProps {
  name: string;
  desc: string | null;
  price: string;
  /** תווית ליד המחיר, למשל "/ לחודש". */
  period?: string;
  /** קידומת קטנה לפני הסכום, למשל «החל מ־». */
  pricePrefix?: string | null;
  stub: PlanTicketStub;
  features: string[];
  icon: IconName;
  accent: string;
  featured?: boolean;
  /** מראה טיפול/ספא — נפרד מכרטיס המנוי הכחול. */
  tone?: "treatment";
  badge?: string;
  cta?: React.ReactNode;
  /** מחירון מדרגות בטבלה קומפקטית, בלי להאריך את כרטיס הכרטיסייה. */
  priceRows?: PlanPriceRow[];
  extraLine?: string | null;
  /**
   * גרסה קומפקטית לדף הבית — אותו כרטיס בלי רשימת יתרונות ובלי גובה מינימלי גדול.
   */
  compact?: boolean;
}

/** כרטיס כניסה לבריכה — גוף, קו גלים, קצה עם מספר וברקוד. */
export function PlanTicketCard({
  name,
  desc,
  price,
  period,
  pricePrefix,
  stub,
  features,
  icon,
  accent,
  featured = false,
  tone,
  badge,
  cta,
  priceRows = [],
  extraLine = null,
  compact = false,
}: PlanTicketCardProps) {
  const stubMeta =
    stub.kind === "entries"
      ? {
          eyebrow: stub.count === 1 ? "כניסה" : "כניסות",
          value: String(stub.count),
          unit: null as string | null,
          compactValue: true,
        }
      : stub.kind === "minutes"
        ? {
            eyebrow: "משך",
            value: String(stub.count),
            unit: "דק׳",
            compactValue: true,
          }
        : stub.kind === "people"
          ? {
              eyebrow: stub.eyebrow ?? "מחיר",
              value: stub.value ?? stub.label ?? "למשתתף",
              unit: stub.unit ?? null,
              compactValue: Boolean(stub.value),
            }
          : {
              eyebrow: "מנוי",
              value: String(stub.count),
              unit: stub.count === 1 ? "חודש" : "חודשים",
              compactValue: true,
            };

  const dark = featured && tone !== "treatment";
  const spa = tone === "treatment";

  return (
    <article
      className={cn(
        "plan-ticket-shadow group relative h-full",
        spa
          ? "plan-ticket-shadow--treatment hover:-translate-y-0.5"
          : compact
            ? "plan-ticket-shadow--compact hover:-translate-y-0.5"
            : "hover:-translate-y-1"
      )}
    >
      <div
        className={cn(
          "plan-ticket relative flex h-full flex-col overflow-hidden sm:flex-row",
          compact ? "plan-ticket--compact" : "min-h-[300px]",
          dark
            ? "bg-[linear-gradient(148deg,#073552_0%,#0a5f96_52%,#0ea0c4_100%)] text-white"
            : spa
              ? "border-2 border-[rgba(232,80,160,0.28)] bg-[linear-gradient(155deg,#fff8fb_0%,#f7fcff_48%,#eef8f6_100%)] text-ink-900"
              : "border border-ink-100 bg-[#fbfcfe] text-ink-900"
        )}
      >
        <div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col",
            compact ? "p-4 sm:p-5" : "p-5 sm:p-6"
          )}
        >
          {dark && (
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
          {spa && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute -end-10 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(232,80,160,0.18),transparent_68%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 start-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(14,160,196,0.16),transparent_70%)]"
              />
            </>
          )}

          <div className="relative flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex items-center justify-center rounded-xl text-white",
                compact ? "h-9 w-9" : "h-11 w-11",
                dark
                  ? "bg-white/15 ring-1 ring-white/25"
                  : spa
                    ? "bg-[var(--logo-magenta)] shadow-soft"
                    : "shadow-soft"
              )}
              style={dark || spa ? undefined : { background: accent }}
            >
              <Icon name={icon} size={compact ? 17 : 20} />
            </div>

            {badge && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide",
                  dark
                    ? "bg-[var(--logo-orange)] text-[#3a2400]"
                    : spa
                      ? "bg-[var(--logo-magenta)] text-white"
                      : "bg-amber-100 text-amber-800"
                )}
              >
                {badge}
              </span>
            )}
          </div>

          <h3
            className={cn(
              "relative break-words font-display font-extrabold leading-snug",
              compact
                ? "mt-3 text-[17px] sm:text-[19px]"
                : "mt-4 text-[20px] sm:text-[22px]",
              dark ? "text-white" : "text-ink-900"
            )}
          >
            {name}
          </h3>

          {desc && (
            <p
              className={cn(
                "relative mt-1.5 leading-relaxed",
                compact ? "line-clamp-2 text-[13px] sm:text-sm" : "text-sm",
                dark ? "text-white/80" : "text-ink-500"
              )}
            >
              {desc}
            </p>
          )}

          {priceRows.length > 0 &&
            (compact ? (
              <CollapsiblePriceRows featured={dark} compact>
                <PriceRowsTable
                  rows={priceRows}
                  extraLine={extraLine}
                  featured={dark}
                  compact
                />
              </CollapsiblePriceRows>
            ) : (
              <div className="relative mt-3">
                <PriceRowsTable
                  rows={priceRows}
                  extraLine={extraLine}
                  featured={dark}
                />
              </div>
            ))}

          <div
            className={cn(
              "relative mt-auto flex items-end justify-between gap-3",
              compact ? "pt-4" : "mt-4"
            )}
          >
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
              {pricePrefix && (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    dark ? "text-white/75" : "text-ink-400"
                  )}
                >
                  {pricePrefix}
                </span>
              )}
              <p
                className={cn(
                  "font-display font-extrabold leading-none tabular-nums",
                  compact
                    ? "text-[26px] sm:text-[28px]"
                    : "text-[34px] sm:text-[38px]",
                  dark
                    ? "text-white"
                    : spa
                      ? "text-[var(--logo-magenta)]"
                      : "text-brand-700"
                )}
              >
                {price}
              </p>
              {period && (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    dark ? "text-white/75" : "text-ink-400"
                  )}
                >
                  {period}
                </span>
              )}
            </div>

            {compact && !cta && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold tracking-wide transition-colors",
                  dark
                    ? "bg-white/15 text-white ring-1 ring-white/30 group-hover:bg-white/25"
                    : spa
                      ? "bg-[var(--logo-magenta)] text-white ring-1 ring-[var(--logo-magenta)] group-hover:brightness-105"
                      : "bg-ink-50 text-brand-700 ring-1 ring-ink-100 group-hover:bg-brand-50 group-hover:ring-brand-200"
                )}
              >
                לחץ כאן
                <Icon name="arrow" size={13} className="opacity-70" />
              </span>
            )}
          </div>

          {!compact && (
            <ul className="relative mt-5 flex flex-1 flex-col gap-2.5">
              {features.map((feature) => (
                <li
                  key={feature}
                  className={cn(
                    "flex items-start gap-2 text-[13.5px] leading-snug sm:text-sm",
                    dark ? "text-white/90" : "text-ink-700"
                  )}
                >
                  <span
                    className="mt-0.5 shrink-0"
                    style={{
                      color: dark ? "rgba(255,255,255,0.95)" : accent,
                    }}
                  >
                    <Icon name="check" size={16} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {cta && (
            <div className={cn("relative", compact ? "mt-4" : "mt-6")}>
              {cta}
            </div>
          )}
        </div>

        <WavePerforation featured={dark} spa={spa} compact={compact} />

        <div
          className={cn(
            "relative flex shrink-0 flex-row items-center justify-between gap-4 overflow-hidden",
            compact
              ? "h-[4.25rem] px-4 sm:h-auto sm:w-[5.75rem] sm:flex-col sm:justify-between sm:px-2.5 sm:py-4"
              : "h-[5.5rem] px-5 sm:h-auto sm:w-[7.5rem] sm:flex-col sm:justify-between sm:px-3 sm:py-6",
            dark
              ? "bg-black/20"
              : spa
                ? "bg-[linear-gradient(180deg,#c43d7a_0%,#0ea0c4_100%)]"
                : "bg-[#d7eef6]"
          )}
        >
          <div className="plan-ticket-stub-waves pointer-events-none absolute inset-0 hidden sm:block">
            <StubWaves featured={dark} spa={spa} />
          </div>

          <p
            className={cn(
              "relative font-bold",
              compact ? "text-[10px]" : "text-[11px]",
              dark || spa ? "text-white/70" : "text-ink-500"
            )}
          >
            {spa ? "טיפול" : "בריכה"}
          </p>

          <div className="relative text-center">
            <p
              className={cn(
                "font-bold",
                compact ? "text-[10px]" : "text-[11px]",
                dark || spa ? "text-white/70" : "text-ink-500"
              )}
            >
              {stubMeta.eyebrow}
            </p>
            <p
              className={cn(
                "mt-0.5 max-w-full font-display font-extrabold leading-none",
                stubMeta.compactValue ? "tabular-nums" : "break-words",
                compact
                  ? stubMeta.compactValue
                    ? "text-[28px] sm:text-[32px]"
                    : "text-[15px] sm:text-[16px]"
                  : stubMeta.compactValue
                    ? "text-4xl sm:text-[44px]"
                    : "text-xl sm:text-2xl",
                dark || spa ? "text-white" : ""
              )}
              style={dark || spa ? undefined : { color: accent }}
            >
              {stubMeta.value}
            </p>
            {stubMeta.unit && (
              <p
                className={cn(
                  "mt-0.5 font-bold",
                  compact ? "text-[10px]" : "text-[11px]",
                  dark || spa ? "text-white/70" : "text-ink-500"
                )}
              >
                {stubMeta.unit}
              </p>
            )}
          </div>

          <div
            aria-hidden
            className={cn(
              "relative flex items-end gap-[2px] sm:flex-col sm:items-stretch sm:justify-center sm:gap-[2px]",
              compact ? "h-5 sm:h-auto sm:w-5" : "h-7 sm:h-auto sm:w-7"
            )}
          >
            {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1].map((w, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-[1px]",
                  dark || spa ? "bg-white/55" : "bg-ink-400/65"
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

function PriceRowsTable({
  rows,
  extraLine,
  featured,
  compact = false,
}: {
  rows: PlanPriceRow[];
  extraLine?: string | null;
  featured: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5",
        compact ? "text-[12px]" : "text-[13px]",
        featured ? "bg-white/10" : "bg-ink-50/80"
      )}
    >
      <div className="grid grid-cols-2 gap-y-1.5">
        {rows.map((row, index) => (
          <div
            key={`${row.range}-${row.price}`}
            className={cn(
              "flex items-baseline justify-between gap-2 px-2.5",
              index % 2 === 1 &&
                (featured
                  ? "border-s border-white/20"
                  : "border-s border-ink-200/70")
            )}
          >
            <span
              className={cn(
                "min-w-0 truncate",
                featured ? "text-white/70" : "text-ink-500"
              )}
            >
              {row.range}
              {row.note ? (
                <span className="ms-1 text-[10px] opacity-80">{row.note}</span>
              ) : null}
            </span>
            <span
              className={cn(
                "shrink-0 font-bold tabular-nums",
                featured ? "text-white" : "text-ink-800"
              )}
            >
              {row.price}
            </span>
          </div>
        ))}
      </div>
      {extraLine && (
        <p
          className={cn(
            "mt-2 border-t pt-1.5 text-[11px]",
            featured
              ? "border-white/15 text-white/70"
              : "border-ink-100 text-ink-500"
          )}
        >
          {extraLine}
        </p>
      )}
    </div>
  );
}

function WavePerforation({
  featured,
  spa,
  compact,
}: {
  featured: boolean;
  spa?: boolean;
  compact: boolean;
}) {
  const stroke = featured
    ? "rgba(255,255,255,0.45)"
    : spa
      ? "rgba(196, 61, 122, 0.35)"
      : "rgba(15, 40, 70, 0.28)";

  return (
    <div
      aria-hidden
      className={cn(
        "relative shrink-0",
        compact ? "h-3 sm:h-auto sm:w-3" : "h-4 sm:h-auto sm:w-4"
      )}
    >
      <svg
        viewBox="0 0 12 200"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden h-full w-full sm:block"
      >
        <path
          d="M6 0c0 8-5 8-5 16s5 8 5 16-5 8-5 16 5 8 5 16-5 8-5 16 5 8 5 16-5 8-5 16 5 8 5 16-5 8-5 16 5 8 5 16-5 8-5 16 5 8 5 16-5 8-5 16 5 8 5 8"
          fill="none"
          stroke={stroke}
          strokeWidth="1.25"
        />
      </svg>
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full sm:hidden"
      >
        <path
          d="M0 6c8 0 8-5 16-5s8 5 16 5 8-5 16-5 8 5 16 5 8-5 16-5 8 5 16 5 8-5 16-5 8 5 16 5 8-5 16-5 8 5 16 5 8-5 16-5 8 5 16 5 8-5 16-5 8 5 8 5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.25"
        />
      </svg>
    </div>
  );
}

function StubWaves({
  featured,
  spa,
}: {
  featured: boolean;
  spa?: boolean;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 200"
      preserveAspectRatio="none"
      className="h-full w-full opacity-40"
    >
      <path
        d="M0 40c20-8 40-8 60 0s40 8 60 0v20c-20 8-40 8-60 0s-40-8-60 0Z"
        fill={
          featured || spa
            ? "rgba(255,255,255,0.16)"
            : "rgba(14,160,196,0.22)"
        }
      />
      <path
        d="M0 150c20-8 40-8 60 0s40 8 60 0v16c-20 8-40 8-60 0s-40-8-60 0Z"
        fill={
          featured || spa
            ? "rgba(255,255,255,0.1)"
            : "rgba(14,160,196,0.16)"
        }
      />
    </svg>
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
