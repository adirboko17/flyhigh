import Image from "next/image";
import { notFound } from "next/navigation";
import { ClassEnrollmentPanel } from "@/components/classes/ClassEnrollmentPanel";
import { ClassSessionGroups } from "@/components/classes/ClassSessionGroups";
import { SlotNoteBadge } from "@/components/classes/SlotNoteBadge";
import { PublicPageHero } from "@/components/layout/PublicPageHero";
import { Badge } from "@/components/ui/Badge";
import {
  displayGenderPolicy,
  formatAudienceFieldLabel,
  formatClassAudience,
  formatClassGenderPolicy,
  pickOneSlotTraineeHint,
} from "@/lib/class-audience";
import { classIsSoldOut, isUnlimitedCapacity } from "@/lib/classes/capacity";
import { isInterestClass } from "@/lib/classes/interest";
import { dayLabel } from "@/lib/constants";
import {
  getPublicClasses,
  getPublicClassSessions,
  getPublicClassSlots,
} from "@/lib/public-data";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import { classPeriodTotal } from "@/lib/finance/classPricing";
import {
  billableClassSessions,
  prorateClassPrice,
} from "@/lib/finance/proratedClassPrice";
import { todayInIsrael } from "@/lib/scheduling/monthGrid";
import { instructorTitle } from "@/lib/instructors/labels";
import { formatTime, formatDate } from "@/utils/format";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const classes = await getPublicClasses();

  return classes.map((cls) => ({ id: cls.id }));
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [classes, allSessions, slots] = await Promise.all([
    getPublicClasses(),
    getPublicClassSessions(id),
    getPublicClassSlots(id),
  ]);

  const cls = classes.find((candidate) => candidate.id === id);

  if (!cls) notFound();

  const today = todayInIsrael();
  const pricingSessions =
    cls.pick_one_slot && slots[0]
      ? allSessions.filter((session) => session.weekly_slot_id === slots[0].id)
      : allSessions;
  const proration = prorateClassPrice(
    classPeriodTotal(Number(cls.price), cls.billing_months),
    pricingSessions,
    today
  );
  const sessions = billableClassSessions(allSessions);
  const interestOnly = isInterestClass(cls);
  const soldOut = classIsSoldOut(cls);
  const unlimited = isUnlimitedCapacity(cls.capacity);
  const scheduleLabel = interestOnly
    ? "ללא מועד עדיין"
    : cls.schedule_days
    ? `ימים ${cls.schedule_days}`
    : cls.schedule_type === "custom"
      ? "תאריכים מותאמים"
      : cls.day_of_week != null
        ? `יום ${dayLabel(cls.day_of_week)}`
        : null;
  const startDateLabel = formatDate(cls.start_date);
  const endDateLabel = formatDate(cls.end_date);

  const heroDescription = interestOnly
    ? cls.gender_policy === "female"
      ? "הרשמה ללא תשלום וללא תאריך — בודקים כמה נרשמות לפני פתיחת החוג"
      : "הרשמה ללא תשלום וללא תאריך — בודקים כמה נרשמים לפני פתיחת החוג"
    : cls.description?.trim() ||
      [scheduleLabel, formatTime(cls.start_time) !== "-" && cls.end_time
          ? `${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`
          : null, cls.instructor_name?.trim()]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="bg-ink-50">
      <PublicPageHero
        badgeIcon="waves"
        badgeIconColor="var(--logo-cyan)"
        badgeText={
          interestOnly
            ? cls.category
              ? `הרשמת עניין · ${cls.category}`
              : "הרשמת עניין"
            : cls.category
              ? `חוג · ${cls.category}`
              : "חוג שחייה"
        }
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
              {soldOut ? "מלא" : unlimited ? "ללא הגבלה" : "יש מקום"}
            </Badge>
            {cls.image_url ? (
              <Image
                src={cls.image_url}
                alt={cls.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-gradient text-6xl text-white">
                🏊
              </div>
            )}
          </div>

          <div className="order-3 lg:mt-6">
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-100 sm:mt-8 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
              <div className="grid grid-cols-2 gap-px sm:gap-4">
                <DetailRow
                  icon="👩‍🏫"
                  label={instructorTitle(cls.instructor_gender)}
                  value={cls.instructor_name}
                />
                {interestOnly ? (
                  <>
                    <DetailRow
                      icon="💳"
                      label="תשלום"
                      value="ללא תשלום בשלב זה"
                    />
                    <DetailRow
                      icon="📅"
                      label="מועד"
                      value="ייקבע אם החוג ייפתח"
                    />
                    <DetailRow
                      icon="✅"
                      label="פתיחת החוג"
                      value={minimumRegistrantsLabel(cls.gender_policy)}
                    />
                    <DetailRow
                      icon="👥"
                      label="מיועד ל"
                      value={formatClassGenderPolicy(cls.gender_policy)}
                    />
                    <DetailRow
                      icon="🎂"
                      label={formatAudienceFieldLabel(cls.audience_type)}
                      value={formatClassAudience(cls)}
                    />
                    {cls.level && (
                      <DetailRow icon="🏅" label="רמה" value={cls.level} />
                    )}
                    <DetailRow
                      icon="🎟️"
                      label="תפוסה"
                      value={
                        unlimited
                          ? "ללא הגבלת מקומות"
                          : `${cls.capacity} מקומות`
                      }
                    />
                  </>
                ) : (
                  <>
                    <DetailRow icon="📅" label="לוח זמנים" value={scheduleLabel} />
                    <DetailRow
                      icon="🕒"
                      label={cls.pick_one_slot ? "הרשמה" : "שעות"}
                      value={
                        cls.pick_one_slot
                          ? "בחירת מועד אחד בשבוע"
                          : cls.start_time && cls.end_time
                            ? `${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`
                            : null
                      }
                    />
                    <DetailRow
                      icon="👥"
                      label="מיועד ל"
                      value={
                        slots.length > 1 &&
                        new Set(slots.map((slot) => slot.gender_policy)).size > 1
                          ? "לפי המועד שנבחר"
                          : formatClassGenderPolicy(
                              slots[0]?.gender_policy ?? cls.gender_policy
                            )
                      }
                    />
                    {cls.audience_type !== "open" && (
                      <DetailRow
                        icon="🎂"
                        label={formatAudienceFieldLabel(cls.audience_type)}
                        value={formatClassAudience(cls)}
                      />
                    )}
                  </>
                )}
              </div>
              {!interestOnly &&
                (hasDetailValue(startDateLabel) || hasDetailValue(endDateLabel)) && (
                <div className="grid grid-cols-1 gap-px sm:mt-4 sm:grid-cols-2 sm:gap-4">
                  <DetailRow
                    icon="🗓️"
                    label="תאריך התחלה"
                    value={startDateLabel}
                  />
                  <DetailRow
                    icon="🏁"
                    label="תאריך סיום"
                    value={endDateLabel}
                  />
                </div>
              )}
            </div>

            {interestOnly && cls.description?.trim() && (
              <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4 sm:mt-6 sm:p-6">
                <p className="text-xs font-semibold text-ink-400">על החוג</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700 sm:text-base">
                  {cls.description.trim()}
                </p>
                <p className="mt-3 text-sm font-medium text-brand-800">
                  {minimumRegistrantsLabel(cls.gender_policy)}.
                </p>
              </div>
            )}

            {!interestOnly && cls.pick_one_slot && slots.length > 0 && (
              <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">
                  מועדים לבחירה
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {pickOneSlotTraineeHint(
                    displayGenderPolicy(
                      cls.gender_policy,
                      slots.map((slot) => slot.gender_policy)
                    )
                  )}
                </p>
                <ul className="mt-4 divide-y divide-ink-100">
                  {slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">
                          {formatWeeklySlotLabel(
                            slot.day_of_week,
                            slot.start_time,
                            slot.end_time,
                            slot.gender_policy
                          )}
                        </span>
                        <SlotNoteBadge note={slot.note} />
                      </span>
                      {slot.available <= 0 && (
                        <span className="text-ink-500">מלא</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!interestOnly && sessions.length > 0 && (
              <div className="mt-8 rounded-3xl border border-ink-100 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">
                  מפגשים
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  {slots.length > 0
                    ? "לחצו על מועד כדי לראות את כל המפגשים שלו."
                    : proration.isLate
                    ? `ההרשמה כוללת ממפגש ${proration.firstSessionNumber} והלאה`
                    : cls.schedule_type === "custom"
                      ? "תאריכים מותאמים לחוג זה"
                      : "רשימת המפגשים בפועל — כולל שינויים ודחיות"}
                </p>
                <ClassSessionGroups
                  sessions={sessions}
                  slots={slots}
                  today={today}
                  showLateBadge={proration.isLate}
                />
              </div>
            )}
          </div>
        </div>

        <div className="order-2">
          <ClassEnrollmentPanel
            cls={cls}
            soldOut={soldOut}
            proration={proration}
            slots={slots}
          />
        </div>
      </div>
    </div>
  );
}

function minimumRegistrantsLabel(
  genderPolicy: "male" | "female" | "mixed" | null | undefined
) {
  if (genderPolicy === "female") return "מותנה במינימום נרשמות";
  if (genderPolicy === "male") return "מותנה במינימום נרשמים";
  return "מותנה במינימום נרשמים";
}

function hasDetailValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return Boolean(trimmed && trimmed !== "-");
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
}) {
  if (!hasDetailValue(value)) return null;

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
