import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatCurrency, formatTime, formatDate } from "@/utils/format";
import type { PublicClass } from "@/types";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_public_classes");
  const cls = ((data as PublicClass[]) ?? []).find((c) => c.id === id);

  if (!cls) notFound();

  const status = CLASS_STATUS[cls.status];
  const soldOut = cls.available <= 0 || cls.status === "full";

  return (
    <div className="bg-ink-50">
      <div className="container-page py-8">
        <Link
          href="/classes"
          className="text-sm font-medium text-ink-500 hover:text-brand-600"
        >
          → חזרה לכל החוגים
        </Link>
      </div>

      <div className="container-page grid gap-8 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-ink-100 sm:h-96">
            {cls.image_url ? (
              <Image
                src={cls.image_url}
                alt={cls.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-gradient text-6xl text-white">
                🏊
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {cls.category && <Badge tone="brand">{cls.category}</Badge>}
            {cls.level && <Badge tone="info">רמה: {cls.level}</Badge>}
          </div>

          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink-900">
            {cls.title}
          </h1>
          {cls.description && (
            <p className="mt-3 leading-relaxed text-ink-600">
              {cls.description}
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DetailRow icon="👩‍🏫" label="מדריכה" value={cls.instructor_name ?? "—"} />
            <DetailRow icon="📅" label="יום בשבוע" value={`יום ${dayLabel(cls.day_of_week)}`} />
            <DetailRow
              icon="🕒"
              label="שעות"
              value={`${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`}
            />
            <DetailRow
              icon="🎂"
              label="גילאים"
              value={cls.age_min || cls.age_max ? `${cls.age_min}–${cls.age_max}` : "כל הגילאים"}
            />
            <DetailRow icon="🗓️" label="תאריך התחלה" value={formatDate(cls.start_date)} />
            <DetailRow icon="🏁" label="תאריך סיום" value={formatDate(cls.end_date)} />
          </div>
        </div>

        {/* כרטיס הרשמה */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card">
            <p className="text-sm text-ink-500">מחיר החוג</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-brand-700">
              {formatCurrency(cls.price)}
            </p>

            <div className="mt-5 rounded-2xl bg-ink-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">מקומות פנויים</span>
                <span className="font-bold text-ink-900">
                  {soldOut ? "מלא" : `${cls.available} מתוך ${cls.capacity}`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200">
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(cls.taken_count) / Math.max(cls.capacity, 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5">
              {soldOut ? (
                <ButtonLink
                  href={`/register?class=${cls.id}&waitlist=1`}
                  variant="secondary"
                  className="w-full"
                >
                  הצטרפות לרשימת המתנה
                </ButtonLink>
              ) : (
                <ButtonLink
                  href={`/register?class=${cls.id}`}
                  size="lg"
                  className="w-full"
                >
                  הרשמה לחוג
                </ButtonLink>
              )}
              <p className="mt-3 text-center text-xs text-ink-400">
                ההרשמה מתבצעת לאחר פתיחת חשבון אישי
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
