import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/utils/format";
import type { PublicClass } from "@/types";

export function ClassCard({ cls }: { cls: PublicClass }) {
  const status = CLASS_STATUS[cls.status];
  const soldOut = cls.available <= 0 || cls.status === "full";

  return (
    <Link
      href={`/classes/${cls.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative h-44 w-full overflow-hidden bg-ink-100">
        {cls.image_url ? (
          <Image
            src={cls.image_url}
            alt={cls.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-brand-gradient text-4xl text-white">
            🏊
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        {cls.category && (
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
            {cls.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-ink-900 group-hover:text-brand-700">
          {cls.title}
        </h3>
        {cls.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-500">
            {cls.description}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          {cls.instructor_name && (
            <div className="col-span-2 flex items-center gap-1.5 text-ink-600">
              <span>👩‍🏫</span>
              {cls.instructor_name}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ink-600">
            <span>📅</span>
            יום {dayLabel(cls.day_of_week)}
          </div>
          <div className="flex items-center gap-1.5 text-ink-600">
            <span>🕒</span>
            {formatTime(cls.start_time)}
          </div>
          {(cls.age_min || cls.age_max) && (
            <div className="flex items-center gap-1.5 text-ink-600">
              <span>🎂</span>
              גילאי {cls.age_min}–{cls.age_max}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-ink-600">
            <span>👥</span>
            {soldOut ? (
              <span className="font-semibold text-red-600">מלא</span>
            ) : (
              <span>{cls.available} מקומות פנויים</span>
            )}
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="font-display text-xl font-extrabold text-brand-700">
            {formatCurrency(cls.price)}
          </span>
          <span className="text-sm font-semibold text-brand-600 group-hover:underline">
            לפרטים והרשמה ←
          </span>
        </div>
      </div>
    </Link>
  );
}
