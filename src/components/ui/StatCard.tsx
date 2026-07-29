import { cn } from "@/utils/cn";

type Tone = "brand" | "aqua" | "amber" | "rose" | "violet" | "slate";

const tones: Record<Tone, { ring: string; icon: string }> = {
  brand: { ring: "from-brand-500/10 to-brand-500/0", icon: "bg-brand-100 text-brand-600" },
  aqua: { ring: "from-aqua-500/10 to-aqua-500/0", icon: "bg-aqua-100 text-aqua-600" },
  amber: { ring: "from-amber-500/10 to-amber-500/0", icon: "bg-amber-100 text-amber-600" },
  rose: { ring: "from-rose-500/10 to-rose-500/0", icon: "bg-rose-100 text-rose-600" },
  violet: { ring: "from-violet-500/10 to-violet-500/0", icon: "bg-violet-100 text-violet-600" },
  slate: { ring: "from-ink-500/10 to-ink-500/0", icon: "bg-ink-100 text-ink-600" },
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: Tone;
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-bl",
          tones[tone].ring
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-1.5 break-words font-display text-2xl font-extrabold text-ink-900 sm:mt-2 sm:text-3xl">
            {value}
          </p>
          {hint && <p className="mt-1 line-clamp-2 text-xs text-ink-400">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg sm:h-11 sm:w-11 sm:text-xl",
              tones[tone].icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
