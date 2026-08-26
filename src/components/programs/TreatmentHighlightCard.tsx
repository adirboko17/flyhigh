import { Icon } from "@/components/icons/Icon";
import { cn } from "@/utils/cn";

/** כרטיס טיפול מובלט — אותו שפה נקייה, עם משקל חזק יותר לקידום. */
export function TreatmentHighlightCard({
  name,
  desc,
  price,
  period,
  compact = false,
}: {
  name: string;
  desc: string | null;
  price: string;
  period?: string;
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden rounded-[22px]",
        "border border-[#0b6f86]/18",
        "bg-[linear-gradient(155deg,#e4f6f8_0%,#f4fcfd_42%,#ffffff_100%)]",
        "shadow-[0_18px_40px_-14px_rgba(8,88,108,0.38)]",
        "transition-[transform,box-shadow] duration-300",
        "hover:-translate-y-1 hover:shadow-[0_24px_48px_-14px_rgba(8,88,108,0.46)]"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-1.5 bg-[linear-gradient(180deg,#085066_0%,#0ea0c4_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -end-8 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(14,160,196,0.28),transparent_68%)]"
      />
      <Icon
        name="drop"
        size={compact ? 148 : 172}
        className="pointer-events-none absolute -bottom-8 -end-4 text-[#0b6f86] opacity-[0.12]"
      />

      <div
        className={cn(
          "relative flex h-full flex-col",
          compact ? "px-5 py-5 sm:px-6" : "px-6 py-6 sm:px-7"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b6f86]">
            טיפול אישי
          </p>
          <span className="rounded-full bg-[#0b6f86] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
            מומלץ
          </span>
        </div>

        <h3
          className={cn(
            "mt-3 font-display font-extrabold leading-tight text-ink-900",
            compact ? "text-[22px] sm:text-[26px]" : "text-[26px] sm:text-[30px]"
          )}
        >
          {name}
        </h3>

        {desc && (
          <p
            className={cn(
              "mt-2 max-w-[22rem] leading-relaxed text-ink-600",
              compact ? "text-[13px] sm:text-sm" : "text-sm"
            )}
          >
            {desc}
          </p>
        )}

        <div
          className={cn(
            "mt-auto flex items-end justify-between gap-4",
            compact ? "pt-6" : "pt-8"
          )}
        >
          <div>
            <p
              className={cn(
                "font-display font-extrabold leading-none tabular-nums text-[#085066]",
                compact ? "text-[32px] sm:text-[36px]" : "text-[40px]"
              )}
            >
              {price}
            </p>
            {period && (
              <p className="mt-1 text-[12px] font-semibold text-ink-500">
                {period.replace(/^\s*\/\s*/, "")}
              </p>
            )}
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0b6f86] px-4 py-2.5",
              "text-[13px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(8,80,100,0.7)]",
              "transition-colors group-hover:bg-[#085066]"
            )}
          >
            לקביעת טיפול
            <Icon name="arrow" size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}
