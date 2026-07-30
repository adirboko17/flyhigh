import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/icons/Icon";
import { dayLabel } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/utils/format";
import type { PublicClass } from "@/types";

const ACCENTS = [
  "var(--logo-cyan)",
  "var(--logo-magenta)",
  "var(--logo-orange)",
] as const;

/** צבע ההדגשה נגזר מהקטגוריה כדי שחוגים מאותו סוג יקבלו תמיד את אותו הצבע. */
function accentFor(seed: string | null | undefined): string {
  if (!seed) return ACCENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  return ACCENTS[hash % ACCENTS.length];
}

export function ClassCard({
  cls,
  preview = false,
}: {
  cls: PublicClass;
  preview?: boolean;
}) {
  const soldOut = cls.available <= 0 || cls.status === "full";
  const lastSpot = !soldOut && cls.available === 1;
  const isBlob = cls.image_url?.startsWith("blob:") ?? false;
  const accent = accentFor(cls.category ?? cls.level ?? cls.title);
  const href = `/classes/${cls.id}`;

  const cardClass =
    "group flex h-full flex-col overflow-hidden rounded-[22px] border border-ink-100 bg-white shadow-card transition-all duration-300" +
    (preview ? "" : " hover:-translate-y-1 hover:shadow-soft");

  const scheduleLabel = cls.schedule_days
    ? `ימים ${cls.schedule_days}`
    : cls.schedule_type === "custom"
      ? "תאריכים מותאמים"
      : `יום ${dayLabel(cls.day_of_week)}`;

  const media = (
    <>
      <span
        aria-hidden
        className="block h-1.5 w-full shrink-0"
        style={{ background: accent }}
      />

      <div className="relative h-44 w-full overflow-hidden bg-ink-100">
        {cls.image_url ? (
          isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cls.image_url}
              alt={cls.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <Image
              src={cls.image_url}
              alt={cls.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized={preview}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center bg-brand-gradient text-4xl text-white">
            🏊
          </div>
        )}

        {(soldOut || lastSpot) && (
          <span
            className="absolute end-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
            style={{
              background: soldOut ? "var(--red-600)" : "var(--logo-magenta)",
            }}
          >
            {soldOut ? "מלא" : "מקום אחרון"}
          </span>
        )}

        {cls.category && (
          <span
            className="absolute bottom-3 start-3 max-w-[65%] truncate rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm"
            style={{ background: accent }}
          >
            {cls.category}
          </span>
        )}
      </div>
    </>
  );

  const content = (
    <div className="flex flex-1 flex-col p-5">
      {preview ? (
        <h3 className="break-words font-display text-[19px] font-extrabold leading-snug text-ink-900">
          {cls.title}
        </h3>
      ) : (
        <h3 className="break-words font-display text-[19px] font-extrabold leading-snug text-ink-900">
          <Link
            href={href}
            prefetch
            className="transition-colors hover:text-[var(--logo-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--logo-cyan)]"
          >
            {cls.title}
          </Link>
        </h3>
      )}
      {cls.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
          {cls.description}
        </p>
      )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-600">
          {cls.instructor_name && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Icon name="user" size={15} className="shrink-0 text-ink-400" />
              <span className="truncate">{cls.instructor_name}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Icon name="calendar" size={15} className="shrink-0 text-ink-400" />
            {scheduleLabel}
          </span>
          {cls.start_time && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <Icon name="clock" size={15} className="shrink-0 text-ink-400" />
              {formatTime(cls.start_time)}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          {(cls.age_min || cls.age_max) && (
            <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-600">
              גילאי {cls.age_min}–{cls.age_max}
            </span>
          )}
          {soldOut ? (
            <span className="font-semibold text-red-600">אין מקומות פנויים</span>
          ) : lastSpot ? (
            <span
              className="font-semibold"
              style={{ color: "var(--logo-magenta)" }}
            >
              מקום אחרון פנוי
            </span>
          ) : (
            <span className="text-ink-500">{cls.available} מקומות פנויים</span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <span className="shrink-0 font-display text-xl font-extrabold text-ink-900">
            {formatCurrency(cls.price)}
          </span>
          {preview ? (
            <span
              className="min-w-0 truncate rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ background: accent }}
            >
              לפרטים והרשמה
            </span>
          ) : (
            <Link
              href={href}
              prefetch
              className="min-w-0 truncate rounded-full px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--logo-cyan)] focus-visible:ring-offset-2"
              style={{ background: accent }}
            >
              לפרטים והרשמה
            </Link>
          )}
        </div>
      </div>
  );

  return (
    <div className={cardClass}>
      {preview ? (
        media
      ) : (
        <Link
          href={href}
          prefetch
          aria-label={`לפרטים והרשמה לחוג ${cls.title}`}
          className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--logo-cyan)]"
        >
          {media}
        </Link>
      )}
      {content}
    </div>
  );
}
