import Link from "next/link";

interface SectionHeadProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  link?: string;
  linkHref?: string;
  accent?: string;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  link,
  linkHref,
  accent = "var(--brand-600)",
}: SectionHeadProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span
            className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide"
            style={{ color: accent }}
          >
            <span
              className="h-0.5 w-[22px] rounded-sm"
              style={{ background: accent }}
            />
            {eyebrow}
          </span>
        )}
        <h2 className="mt-2.5 font-display text-[34px] font-extrabold leading-tight text-ink-900">
          {title}
        </h2>
        {sub && <p className="mt-1.5 text-ink-500">{sub}</p>}
      </div>
      {link && linkHref && (
        <Link
          href={linkHref}
          className="inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold underline decoration-2 underline-offset-[5px] transition-colors hover:opacity-90"
          style={{
            color: accent,
            borderColor: `color-mix(in srgb, ${accent} 28%, white)`,
            backgroundColor: `color-mix(in srgb, ${accent} 10%, white)`,
            textDecorationColor: `color-mix(in srgb, ${accent} 45%, white)`,
          }}
        >
          {link}
        </Link>
      )}
    </div>
  );
}
