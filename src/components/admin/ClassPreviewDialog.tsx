"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminClassRow } from "@/components/admin/ClassList";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatClassOccupancy, isUnlimitedCapacity } from "@/lib/classes/capacity";
import { CLASS_SESSION_STATUS, CLASS_STATUS, dayLabel } from "@/lib/constants";
import {
  formatAudienceFieldLabel,
  formatClassAudience,
  formatClassGenderPolicy,
} from "@/lib/class-audience";
import { classPeriodTotal, parseBillingMonths } from "@/lib/finance/classPricing";
import { describeTier, parseSiblingTiers } from "@/lib/finance/siblingDiscount";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/types/database.types";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, formatTime } from "@/utils/format";

type PreviewSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: Enums<"class_session_status">;
  notes: string | null;
  substitute_instructor_name: string | null;
};

/**
 * תצוגת החוג כפי שהיא נראית באתר — כל הפרטים והמפגשים בפועל.
 * המפגשים נטענים רק בפתיחת החלון, כדי לא להכביד על טעינת עמוד החוגים.
 */
export function ClassPreviewDialog({
  cls,
  registered,
  onClose,
}: {
  cls: AdminClassRow;
  registered: number;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<PreviewSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    createClient()
      .rpc("list_public_class_sessions", { p_class_id: cls.id })
      .then(({ data, error: rpcError }) => {
        if (!active) return;
        if (rpcError) {
          setError("טעינת המפגשים נכשלה");
          setSessions([]);
          return;
        }
        setSessions(data ?? []);
      });

    return () => {
      active = false;
    };
  }, [cls.id]);

  const status = CLASS_STATUS[cls.status];
  const tiers = parseSiblingTiers(cls.sibling_discount_tiers);
  const unlimited = isUnlimitedCapacity(cls.capacity);
  const available = unlimited
    ? null
    : Math.max(0, (cls.capacity ?? 0) - registered);
  const upcoming = (sessions ?? []).filter(
    (session) => session.status === "scheduled"
  );

  const audienceLabel = formatClassAudience(cls);
  const genderLabel = formatClassGenderPolicy(cls.gender_policy);

  const scheduleLabel =
    cls.schedule_type === "custom"
      ? "תאריכים מותאמים"
      : cls.day_of_week !== null
        ? `כל יום ${dayLabel(cls.day_of_week)}`
        : "לא הוגדר";

  const hoursLabel =
    cls.start_time && cls.end_time
      ? `${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`
      : cls.start_time
        ? formatTime(cls.start_time)
        : "לא הוגדרו";

  return (
    <Modal
      open
      onClose={onClose}
      title={cls.title}
      description={
        cls.interest_only
          ? "הרשמת עניין · ללא תשלום וללא מועד"
          : `${scheduleLabel} · ${hoursLabel}`
      }
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-ink-100 sm:h-56">
          {cls.image_url ? (
            <Image
              src={cls.image_url}
              alt={cls.title}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-brand-gradient text-5xl text-white">
              🏊
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone={status.tone}>{status.label}</Badge>
          {cls.interest_only && <Badge tone="info">הרשמת עניין</Badge>}
          {cls.category && <Badge tone="brand">{cls.category}</Badge>}
          {cls.level && <Badge tone="info">רמה: {cls.level}</Badge>}
          {upcoming.length > 0 && (
            <Badge tone="neutral">{upcoming.length} מפגשים מתוכננים</Badge>
          )}
        </div>

        {cls.description?.trim() && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
            {cls.description}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailBox
            icon="👩‍🏫"
            label="מדריכה"
            value={cls.instructors?.full_name ?? "לא שובצה"}
          />
          {!cls.interest_only && (
            <>
              <DetailBox icon="📅" label="לוח זמנים" value={scheduleLabel} />
              <DetailBox icon="🕒" label="שעות" value={hoursLabel} />
            </>
          )}
          <DetailBox icon="👥" label="מיועד ל" value={genderLabel} />
          <DetailBox
            icon="🎂"
            label={formatAudienceFieldLabel(cls.audience_type)}
            value={audienceLabel}
          />
          <DetailBox
            icon="💰"
            label="מחיר"
            value={
              cls.interest_only
                ? "ללא תשלום"
                : parseBillingMonths(cls.billing_months)
                  ? `${formatCurrency(cls.price)} לחודש × ${parseBillingMonths(cls.billing_months)} · סה״כ ${formatCurrency(classPeriodTotal(cls.price, cls.billing_months))}`
                  : formatCurrency(cls.price)
            }
          />
          <DetailBox
            icon="👨‍👩‍👧"
            label="תפוסה"
            value={formatClassOccupancy(registered, cls.capacity)}
            hint={
              unlimited
                ? "אין תקרת משתתפים"
                : available && available > 0
                  ? `${available} מקומות פנויים`
                  : "אין מקומות פנויים"
            }
          />
          {!cls.interest_only && (
            <>
              <DetailBox
                icon="🗓️"
                label="תאריך התחלה"
                value={cls.start_date ? formatDate(cls.start_date) : "לא הוגדר"}
              />
              <DetailBox
                icon="🏁"
                label="תאריך סיום"
                value={cls.end_date ? formatDate(cls.end_date) : "לא הוגדר"}
              />
            </>
          )}
        </div>

        {cls.interest_only && (
          <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            זו הרשמת עניין: הלקוחות נרשמים בלי תשלום. אחרי שיהיו מספיק נרשמים
            אפשר לפתוח חוג משולם או לגבות בטלפון.
          </p>
        )}

        {!cls.interest_only && (
        <section>
          <h3 className="font-display text-base font-bold text-ink-900">
            הנחת אחים
          </h3>
          {tiers.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tiers
                .slice()
                .sort((a, b) => a.minChildren - b.minChildren)
                .map((tier) => (
                  <li key={tier.minChildren}>
                    <Badge tone="success">{describeTier(tier)}</Badge>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-ink-500">
              לפי ברירת המחדל שהוגדרה בעמוד ההגדרות.
            </p>
          )}
        </section>
        )}

        {!cls.interest_only && (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-base font-bold text-ink-900">
              מפגשים
            </h3>
            {sessions && sessions.length > 0 && (
              <span className="text-xs text-ink-400">
                {sessions.length} מפגשים בסך הכול
              </span>
            )}
          </div>

          {sessions === null ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : sessions.length === 0 ? (
            <p className="mt-1.5 text-sm text-ink-500">
              עדיין לא נוצרו מפגשים לחוג זה.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {sessions.map((session) => {
                const sessionStatus = CLASS_SESSION_STATUS[session.status];
                const cancelled = session.status === "cancelled";

                return (
                  <li
                    key={session.id}
                    className={cn("px-4 py-3", cancelled && "bg-ink-50/60")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "font-semibold text-ink-900",
                            cancelled && "text-ink-400 line-through"
                          )}
                        >
                          {formatDate(session.session_date)}
                        </span>
                        <span className="text-xs text-ink-400">
                          יום {dayLabel(weekdayOf(session.session_date))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums text-ink-600">
                          {formatTime(session.start_time)}–
                          {formatTime(session.end_time)}
                        </span>
                        <Badge tone={sessionStatus.tone}>
                          {sessionStatus.label}
                        </Badge>
                      </div>
                    </div>

                    {session.substitute_instructor_name && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        מדריכה מחליפה: {session.substitute_instructor_name}
                      </p>
                    )}
                    {session.notes && (
                      <p className="mt-1 text-xs text-ink-400">{session.notes}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          <Link
            href={`/classes/${cls.id}`}
            target="_blank"
            className="rounded-xl bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200"
          >
            פתיחה בעמוד באתר
          </Link>
          <Link
            href={`/admin/classes/${cls.id}/edit`}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            עריכת החוג
          </Link>
        </div>
      </div>
    </Modal>
  );
}

/** יום בשבוע (0=ראשון) מתוך "YYYY-MM-DD", בלי תלות באזור הזמן של הדפדפן. */
function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function DetailBox({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
      <span aria-hidden className="text-xl">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="truncate font-semibold text-ink-900">{value}</p>
        {hint && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
    </div>
  );
}
