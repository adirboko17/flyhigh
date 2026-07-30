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
      <div className="min-w-0">
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
        <h2 className="mt-2.5 font-display text-2xl font-extrabold leading-tight text-ink-900 sm:text-[34px]">
          {title}
        </h2>
        {sub && <p className="mt-1.5 text-sm text-ink-500 sm:text-base">{sub}</p>}
      </div>
      {link && linkHref && (
        <Link
          href={linkHref}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          {link}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
      )}
    </div>
  );
}
