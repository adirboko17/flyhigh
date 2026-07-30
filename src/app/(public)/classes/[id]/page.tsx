import Image from "next/image";
import { notFound } from "next/navigation";
import { ClassEnrollmentPanel } from "@/components/classes/ClassEnrollmentPanel";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { Badge } from "@/components/ui/Badge";
import { dayLabel } from "@/lib/constants";
import {
  getPublicClasses,
  getPublicClassSessions,
} from "@/lib/public-data";
import { formatTime, formatDate } from "@/utils/format";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [classes, allSessions] = await Promise.all([
    getPublicClasses(),
    getPublicClassSessions(id),
  ]);

  const sessions = allSessions.filter(
    (session) => session.status === "scheduled"
  );

  const cls = classes.find((candidate) => candidate.id === id);

  if (!cls) notFound();

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
        {/* display:contents במובייל מפרק את העמודה לפריטי גריד, כך שהתמונה עולה מעל כרטיס ההרשמה ושאר הפרטים יורדים מתחתיו. */}
        <div className="contents lg:order-1 lg:block">
          <div className="relative order-1 h-72 w-full overflow-hidden rounded-3xl bg-ink-100 sm:h-96">
            <Badge
              tone={soldOut ? "warning" : "success"}
              className="absolute end-3 top-3 z-10 px-3 py-1 text-sm shadow-sm sm:end-4 sm:top-4"
            >
              {soldOut ? "מלא" : "יש מקום"}
            </Badge>
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

          <div className="order-3 lg:mt-6">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-100 bg-ink-100 sm:mt-8 sm:gap-4 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
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
        </div>

        <div className="order-2">
          <ClassEnrollmentPanel cls={cls} soldOut={soldOut} />
        </div>
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
    <div className="flex min-w-0 items-center gap-2 bg-white p-3 sm:gap-3 sm:rounded-2xl sm:border sm:border-ink-100 sm:p-4">
      <span className="shrink-0 text-lg sm:text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-ink-400 sm:text-xs">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold leading-tight text-ink-900 sm:mt-0 sm:text-base sm:leading-normal">
          {value}
        </p>
      </div>
    </div>
  );
}
