"use client";

import Image from "next/image";
import { ClassCard } from "@/components/classes/ClassCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  formatAudienceFieldLabel,
  formatClassAudience,
  formatClassGenderPolicy,
  type ClassAudienceType,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { CLASS_STATUS } from "@/lib/constants";
import {
  formatScheduleSummary,
  formToPreviewClass,
  type ClassScheduleState,
} from "@/lib/scheduling/classSchedule";
import { classPeriodTotal } from "@/lib/finance/classPricing";
import { classPriceFromPublicCounts } from "@/lib/finance/proratedClassPrice";
import { formatDate, formatTime } from "@/utils/format";
import type { PublicClass } from "@/types";
import {
  ClassPriceAmount,
  ClassPriceNote,
  classPriceLabel,
} from "@/components/classes/ClassPrice";

export type ClassPreviewForm = {
  title: string;
  description: string;
  category: string;
  level: string;
  gender_policy: ClassGenderPolicy;
  audience_type: ClassAudienceType;
  age_min: string;
  age_max: string;
  age_min_unit?: "years" | "months";
  age_max_unit?: "years" | "months";
  grade_min: string;
  grade_max: string;
  capacity: string;
  price: string;
  price_mode?: "period" | "monthly";
  pick_one_slot?: boolean;
  billing_months?: string;
};

export function ClassPreviewPanel({
  form,
  schedule,
  imageUrl,
  instructorName,
  previewStatus = "active",
}: {
  form: ClassPreviewForm;
  schedule: ClassScheduleState;
  imageUrl: string | null;
  instructorName: string | null;
  previewStatus?: PublicClass["status"];
}) {
  const cls = formToPreviewClass(
    form,
    schedule,
    imageUrl,
    instructorName,
    previewStatus
  );
  const hasContent = Boolean(form.title.trim() || imageUrl);
  const upcoming = schedule.sessions
    .filter((s) => s.status === "scheduled")
    .slice(0, 4);

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
        <p className="text-sm text-ink-500">
          כך החוג יופיע באתר לפני הפרסום
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {!hasContent ? (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            מלאו שם חוג והעלו תמונה כדי לראות תצוגה מקדימה
          </p>
        ) : (
          <>
            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink-700">
                כרטיס בקטלוג
              </h3>
              <ClassCard cls={cls} preview />
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink-700">
                עמוד החוג
              </h3>
              <ClassPagePreview cls={cls} upcoming={upcoming} />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ClassPagePreview({
  cls,
  upcoming,
}: {
  cls: PublicClass;
  upcoming: ClassScheduleState["sessions"];
}) {
  const status = CLASS_STATUS[cls.status];
  const isBlob = cls.image_url?.startsWith("blob:") ?? false;
  const scheduleLabel =
    cls.schedule_days ??
    formatScheduleSummary(
      cls.schedule_type ?? "weekly",
      [],
      upcoming.map((s) => ({ ...s, status: s.status }))
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
      <div className="bg-brand-gradient px-4 py-3">
        <span className="text-xs font-medium text-white/90">חזרה לכל החוגים</span>
      </div>

      <div className="space-y-4 p-4">
        <div className="relative h-40 overflow-hidden rounded-2xl bg-ink-100">
          {cls.image_url ? (
            isBlob ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cls.image_url}
                alt={cls.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={cls.image_url}
                alt={cls.title}
                fill
                sizes="400px"
                className="object-cover"
                unoptimized={cls.id === "preview"}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-brand-gradient text-4xl text-white">
              🏊
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          {cls.category && <Badge tone="brand">{cls.category}</Badge>}
          {cls.level && <Badge tone="info">רמה: {cls.level}</Badge>}
        </div>

        <h4 className="font-display text-xl font-extrabold text-ink-900">
          {cls.title}
        </h4>
        {cls.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-600">
            {cls.description}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <PreviewDetailRow
            icon="👩‍🏫"
            label="מדריכה"
            value={cls.instructor_name ?? "-"}
          />
          <PreviewDetailRow icon="📅" label="לוח זמנים" value={scheduleLabel} />
          <PreviewDetailRow
            icon="🕒"
            label="שעות"
            value={`${formatTime(cls.start_time)}–${formatTime(cls.end_time)}`}
          />
          <PreviewDetailRow
            icon="👥"
            label="מיועד ל"
            value={formatClassGenderPolicy(cls.gender_policy)}
          />
          <PreviewDetailRow
            icon="🎂"
            label={formatAudienceFieldLabel(cls.audience_type)}
            value={formatClassAudience(cls)}
          />
          <PreviewDetailRow
            icon="🗓️"
            label="תאריך התחלה"
            value={formatDate(cls.start_date)}
          />
          <PreviewDetailRow
            icon="🏁"
            label="תאריך סיום"
            value={formatDate(cls.end_date)}
          />
        </div>

        {upcoming.length > 0 && (
          <div className="rounded-2xl border border-ink-100 bg-white p-3">
            <p className="text-xs font-semibold text-ink-700">מפגשים קרובים</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-600">
              {upcoming.map((s) => (
                <li key={`${s.sessionDate}-${s.startTime}`}>
                  {formatDate(s.sessionDate)} · {formatTime(s.startTime)}–
                  {formatTime(s.endTime)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <ClassPreviewPrice cls={cls} />
          <div className="mt-3 rounded-xl bg-ink-50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-500">מקומות פנויים</span>
              <span className="font-bold text-ink-900">
                {cls.available} מתוך {cls.capacity}
              </span>
            </div>
            {(cls.billable_session_count ?? cls.session_count) > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-ink-500">מפגשים</span>
                <span className="font-bold text-ink-900">
                  {cls.billable_session_count ?? cls.session_count}
                </span>
              </div>
            )}
          </div>
          <Button type="button" size="sm" className="mt-3 w-full" disabled>
            הרשמה לחוג
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClassPreviewPrice({ cls }: { cls: PublicClass }) {
  const proration = classPriceFromPublicCounts(
    classPeriodTotal(Number(cls.price), cls.billing_months),
    cls.billable_session_count,
    cls.remaining_session_count
  );

  return (
    <>
      <p className="text-xs text-ink-500">
        {classPriceLabel(proration, cls.billing_months)}
      </p>
      <ClassPriceAmount
        proration={proration}
        billingMonths={cls.billing_months}
      />
      <div className="mt-1">
        <ClassPriceNote
          proration={proration}
          billingMonths={cls.billing_months}
        />
      </div>
    </>
  );
}

function PreviewDetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-3">
      <span>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-ink-400">{label}</p>
        <p className="truncate text-xs font-semibold text-ink-900">{value}</p>
      </div>
    </div>
  );
}
