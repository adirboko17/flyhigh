import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { ClassEnrollmentPanel } from "@/components/classes/ClassEnrollmentPanel";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { createClient } from "@/lib/supabase/server";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatTime, formatDate } from "@/utils/format";
import type { PublicClass } from "@/types";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { data: allSessions }] = await Promise.all([
    supabase.rpc("list_public_classes"),
    // דרך RPC כדי שגם הורים יראו את שם המדריכה המחליפה, בלי לחשוף את טבלת המדריכות.
    supabase.rpc("list_public_class_sessions", { p_class_id: id }),
  ]);

  const sessions = (allSessions ?? []).filter(
    (session) => session.status === "scheduled"
  );

  const cls = ((data as PublicClass[]) ?? []).find((c) => c.id === id);

  if (!cls) notFound();

  const status = CLASS_STATUS[cls.status];
  const soldOut = cls.available <= 0 || cls.status === "full";
  const scheduleLabel = cls.schedule_days
    ? `ימים ${cls.schedule_days}`
    : cls.schedule_type === "custom"
      ? "תאריכים מותאמים"
      : `יום ${dayLabel(cls.day_of_week)}`;

  const heroDescription =
    cls.description?.trim() ||
    `${scheduleLabel} · ${formatTime(cls.start_time)}–${formatTime(cls.end_time)}${cls.instructor_name ? ` · ${cls.instructor_name}` : ""}`;

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="waves"
        badgeIconColor="var(--logo-cyan)"
        badgeText={cls.category ? `חוג · ${cls.category}` : "חוג שחייה"}
        title={cls.title}
        description={heroDescription}
        backLink={{ href: "/classes", label: "חזרה לכל החוגים" }}
        backLinkPlacement="below-description"
        size="compact"
      />

      <div className="container-page relative z-[3] grid gap-8 pb-16 pt-8 lg:grid-cols-[1.4fr_1fr]">
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
            {cls.session_count != null && cls.session_count > 0 && (
              <Badge tone="neutral">{cls.session_count} מפגשים</Badge>
            )}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DetailRow icon="👩‍🏫" label="מדריכה" value={cls.instructor_name ?? "-"} />
            <DetailRow icon="📅" label="לוח זמנים" value={scheduleLabel} />
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

          {sessions.length > 0 && (
            <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="font-display text-lg font-bold text-ink-900">
                מפגשים מתוכננים
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {cls.schedule_type === "custom"
                  ? "תאריכים מותאמים לחוג זה"
                  : "רשימת המפגשים בפועל — כולל שינויים ודחיות"}
              </p>
              <ul className="mt-4 divide-y divide-ink-100">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <span className="font-semibold text-ink-900">
                      {formatDate(session.session_date)}
                    </span>
                    <span className="text-ink-600">
                      {formatTime(session.start_time)}–{formatTime(session.end_time)}
                    </span>
                    {session.substitute_instructor_name && (
                      <Badge tone="warning" className="w-full justify-center sm:w-auto">
                        מדריכה מחליפה: {session.substitute_instructor_name}
                      </Badge>
                    )}
                    {session.notes && (
                      <span className="w-full text-xs text-ink-400">{session.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <ClassEnrollmentPanel cls={cls} soldOut={soldOut} />
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
