import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/paths";
import { formatClassAudience, formatClassGenderPolicy } from "@/lib/class-audience";
import { dayLabel } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { classPeriodTotal } from "@/lib/finance/classPricing";
import { classPriceFromPublicCounts } from "@/lib/finance/proratedClassPrice";
import { formatTime } from "@/utils/format";
import { classIsSoldOut } from "@/lib/classes/capacity";
import { isInterestClass } from "@/lib/classes/interest";
import type { PublicClass } from "@/types";
import { ClassPriceAmount, ClassPriceNote, classPriceLabel } from "./ClassPrice";

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
  const interestOnly = isInterestClass(cls);
  const proration = classPriceFromPublicCounts(
    classPeriodTotal(Number(cls.price), cls.billing_months),
    cls.billable_session_count,
    cls.remaining_session_count
  );
  const ended = !interestOnly && proration.hasEnded;
  const soldOut = !ended && classIsSoldOut(cls);
  const closed = ended || soldOut;
  const isBlob = cls.image_url?.startsWith("blob:") ?? false;
  const accent = accentFor(cls.category ?? cls.level ?? cls.title);
  const href = `/classes/${cls.id}`;

  const scheduleLabel = interestOnly
    ? "הרשמה ללא תאריך"
    : cls.pick_one_slot
      ? cls.schedule_days
        ? `בחירת מועד · ימים ${cls.schedule_days}`
        : "בחירת מועד אחד בשבוע"
      : cls.schedule_days
        ? `ימים ${cls.schedule_days}`
        : cls.schedule_type === "custom"
          ? "תאריכים מותאמים"
          : `יום ${dayLabel(cls.day_of_week)}`;

  const audienceLabel =
    cls.audience_type === "grade" &&
    (cls.grade_min != null || cls.grade_max != null)
      ? formatClassAudience(cls)
      : null;

  const genderLabel =
    cls.gender_policy && cls.gender_policy !== "mixed"
      ? formatClassGenderPolicy(cls.gender_policy)
      : null;

  const availability = ended
    ? { text: "החוג הסתיים", tone: "danger" as const }
    : soldOut
      ? { text: "החוג מלא", tone: "danger" as const }
      : null;

  const card = (
    <article
      className={cn(
        "class-card group relative flex h-full flex-col overflow-hidden",
        !preview && "hover:-translate-y-1"
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-100">
        {cls.image_url ? (
          isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cls.image_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <Image
              src={cls.image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              unoptimized
            />
          )
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{
              background: `linear-gradient(148deg, #073552 0%, ${accent} 100%)`,
            }}
          >
            <Icon name="waves" size={42} className="text-white/85" />
          </div>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,30,48,0.08)_0%,rgba(7,30,48,0.0)_42%,rgba(7,30,48,0.55)_100%)]"
        />

        {(ended || soldOut) && (
          <span
            className="absolute end-3 top-3 rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm"
            style={{ background: "#c0364a" }}
          >
            {ended ? "הסתיים" : "מלא"}
          </span>
        )}

        {cls.category && (
          <span
            className="absolute bottom-3 start-3 z-[1] inline-flex max-w-[70%] items-center truncate rounded-lg px-3 py-1.5 text-xs font-extrabold text-white shadow-md"
            style={{ background: accent }}
          >
            {cls.category}
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col bg-[#fbfcfe] p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />

        <h3 className="break-words font-display text-[19px] font-extrabold leading-snug text-ink-900 sm:text-[20px]">
          {cls.title}
        </h3>

        {cls.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {cls.description}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {cls.instructor_name && (
            <MetaRow icon="user" accent={accent} text={cls.instructor_name} />
          )}
          <MetaRow icon="calendar" accent={accent} text={scheduleLabel} />
          {!interestOnly && cls.start_time && (
            <MetaRow
              icon="clock"
              accent={accent}
              text={formatTime(cls.start_time)}
            />
          )}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {interestOnly && <InfoChip>הרשמת עניין</InfoChip>}
          {genderLabel && <InfoChip>{genderLabel}</InfoChip>}
          {audienceLabel && <InfoChip>{audienceLabel}</InfoChip>}
          {availability && (
            <span
              className={cn(
                "text-sm font-semibold",
                availability.tone === "danger" && "text-red-600"
              )}
            >
              {availability.text}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-100/80 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
              {classPriceLabel(proration, cls.billing_months, interestOnly)}
            </p>
            <div className="mt-0.5">
              <ClassPriceAmount
                proration={proration}
                soldOut={closed}
                billingMonths={cls.billing_months}
                interestOnly={interestOnly}
              />
            </div>
            <div className="mt-1 max-w-[12rem]">
              <ClassPriceNote
                proration={proration}
                compact
                billingMonths={cls.billing_months}
                interestOnly={interestOnly}
              />
            </div>
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold tracking-wide transition-colors",
              closed
                ? "bg-ink-100 text-ink-500"
                : "text-white shadow-sm group-hover:brightness-110"
            )}
            style={closed ? undefined : { background: accent }}
          >
            {closed ? "לפרטים" : "לפרטים והרשמה"}
            {!closed && <Icon name="arrow" size={13} className="opacity-80" />}
          </span>
        </div>
      </div>
    </article>
  );

  if (preview) return card;

  return (
    <Link
      href={href}
      prefetch
      aria-label={`לפרטים והרשמה לחוג ${cls.title}`}
      className="block h-full rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}

function MetaRow({
  icon,
  accent,
  text,
}: {
  icon: IconName;
  accent: string;
  text: string;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-sm text-ink-700">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: accent }}
      >
        <Icon name={icon} size={14} />
      </span>
      <span className="truncate font-medium">{text}</span>
    </li>
  );
}

function InfoChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-600">
      {children}
    </span>
  );
}
