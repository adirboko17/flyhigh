"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminRowActions,
  EyeMenuIcon,
  EyeOffMenuIcon,
  UserPlusMenuIcon,
} from "@/components/admin/AdminRowActions";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import {
  AssignToClassDialog,
  type AssignMode,
} from "@/components/admin/AssignToClassDialog";
import { ClassPreviewDialog } from "@/components/admin/ClassPreviewDialog";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { setClassStatus } from "@/lib/admin/classStatus";
import {
  ATTENDANCE_STATUS,
  CLASS_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  WAITLIST_STATUS,
  dayLabel,
} from "@/lib/constants";
import { cn } from "@/utils/cn";
import type { Enums, Json } from "@/types/database.types";
import { calcAge, formatCurrency, formatDate, formatTime } from "@/utils/format";

export type AdminClassEnrollment = {
  id: string;
  class_id: string | null;
  parent_id: string;
  child_id: string | null;
  admin_assigned: boolean;
  status: keyof typeof ENROLLMENT_STATUS;
  payment_status: keyof typeof ENROLLMENT_PAYMENT_STATUS;
  created_at: string;
  children: { full_name: string; birth_date: string | null } | null;
  profiles: { full_name: string; phone: string | null } | null;
};

export type AdminClassWaitlistEntry = {
  id: string;
  class_id: string | null;
  parent_id: string;
  child_id: string | null;
  status: keyof typeof WAITLIST_STATUS;
  created_at: string;
  children: { full_name: string } | null;
  profiles: { full_name: string; phone: string | null } | null;
};

export type AdminClassAttendance = {
  id: string;
  class_id: string | null;
  date: string;
  status: keyof typeof ATTENDANCE_STATUS;
  children: { full_name: string } | null;
  instructors: { full_name: string } | null;
};

export type AdminClassRow = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  description: string | null;
  image_url: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  age_min: number | null;
  age_max: number | null;
  price: number;
  capacity: number;
  status: keyof typeof CLASS_STATUS;
  schedule_type: Enums<"schedule_type">;
  start_date: string | null;
  end_date: string | null;
  sibling_discount_tiers: Json | null;
  instructors: { full_name: string } | null;
  enrollments: AdminClassEnrollment[];
  waitlist: AdminClassWaitlistEntry[];
  attendance: AdminClassAttendance[];
};

type PanelTab = "enrollments" | "waitlist" | "attendance";

interface ClassListProps {
  classes: AdminClassRow[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesClass(item: AdminClassRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.category ?? "").includes(q) ||
    normalizeSearch(item.instructors?.full_name ?? "").includes(q)
  );
}

/** נרשמים שתופסים מקום בפועל — ביטולים לא נספרים. */
function activeEnrollments(item: AdminClassRow) {
  return item.enrollments.filter((e) => e.status !== "cancelled");
}

/** ממתינים שעדיין רלוונטיים — מי שהצטרף, ויתר או פג תוקפו כבר לא בתור. */
function openWaitlist(item: AdminClassRow) {
  return item.waitlist.filter(
    (w) => w.status === "waiting" || w.status === "offered"
  );
}

function attendanceRate(item: AdminClassRow) {
  if (item.attendance.length === 0) return null;
  const present = item.attendance.filter((a) => a.status === "present").length;
  return Math.round((present / item.attendance.length) * 100);
}

function ageRangeLabel(min: number | null, max: number | null) {
  if (min !== null && max !== null) return `גילאי ${min}–${max}`;
  if (min !== null) return `מגיל ${min}`;
  if (max !== null) return `עד גיל ${max}`;
  return null;
}

function scheduleLabel(item: AdminClassRow) {
  if (item.day_of_week === null && !item.start_time) return "לוח זמנים לא הוגדר";
  const day = item.day_of_week === null ? null : `יום ${dayLabel(item.day_of_week)}`;
  const hours = item.start_time
    ? item.end_time
      ? `${formatTime(item.start_time)}–${formatTime(item.end_time)}`
      : formatTime(item.start_time)
    : null;
  return [day, hours].filter(Boolean).join(" · ");
}

export function ClassList({ classes }: ClassListProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{
    cls: AdminClassRow;
    tab: PanelTab;
  } | null>(null);
  const [previewed, setPreviewed] = useState<AdminClassRow | null>(null);
  const [manualAssign, setManualAssign] = useState<AdminClassRow | null>(null);

  const filtered = useMemo(
    () => classes.filter((c) => matchesClass(c, query)),
    [classes, query]
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  if (classes.length === 0) {
    return (
      <EmptyState
        title="אין חוגים עדיין"
        description="צרו את החוג הראשון שלכם."
        action={<ButtonLink href="/admin/classes/new">+ חוג חדש</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ClassSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={classes.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו חוגים"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              onOpenPanel={(tab) => setSelected({ cls, tab })}
              onPreview={() => setPreviewed(cls)}
              onAssign={() => setManualAssign(cls)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ClassDetailPanel
          cls={selected.cls}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
        />
      )}

      {previewed && (
        <ClassPreviewDialog
          cls={previewed}
          registered={activeEnrollments(previewed).length}
          onClose={() => setPreviewed(null)}
        />
      )}

      {manualAssign && (
        <AssignToClassDialog
          cls={manualAssign}
          mode={{ kind: "manual" }}
          registered={activeEnrollments(manualAssign).length}
          onClose={() => setManualAssign(null)}
        />
      )}
    </div>
  );
}

function ClassCard({
  cls,
  onOpenPanel,
  onPreview,
  onAssign,
}: {
  cls: AdminClassRow;
  onOpenPanel: (tab: PanelTab) => void;
  onPreview: () => void;
  onAssign: () => void;
}) {
  const router = useRouter();
  const status = CLASS_STATUS[cls.status];
  const registered = activeEnrollments(cls).length;
  const waiting = openWaitlist(cls).length;
  const rate = attendanceRate(cls);
  const ratio = cls.capacity > 0 ? registered / cls.capacity : 0;
  const ageLabel = ageRangeLabel(cls.age_min, cls.age_max);

  const barTone =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.75 ? "bg-amber-500" : "bg-aqua-500";

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative h-32 w-full shrink-0 overflow-hidden bg-ink-100">
        {cls.image_url ? (
          <Image
            src={cls.image_url}
            alt={cls.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--brand-gradient-soft)] text-4xl">
            🏊
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <Badge tone={status.tone} className="shadow-soft">
            {status.label}
          </Badge>
          {/* בלי backdrop-filter/transform כאן — הם יוצרים containing block
              שכולא את תפריט הפעולות (position: fixed) בתוך ה-overflow-hidden של הכרטיס. */}
          <div className="rounded-lg bg-white/95 shadow-soft">
            <AdminRowActions
              editHref={`/admin/classes/${cls.id}/edit`}
              itemLabel={cls.title}
              onView={onPreview}
              extraMenuItems={[
                {
                  label: "שיבוץ לחוג",
                  icon: <UserPlusMenuIcon className="text-brand-600" />,
                  onClick: onAssign,
                },
                ...(cls.status === "inactive"
                  ? [
                      {
                        label: "הפעלה — הצגה באתר",
                        icon: <EyeMenuIcon className="text-brand-600" />,
                        onClick: async () => {
                          const result = await setClassStatus(
                            createClient(),
                            cls.id,
                            "active"
                          );
                          if (result.error) {
                            window.alert(result.error);
                            return;
                          }
                          router.refresh();
                        },
                      },
                    ]
                  : [
                      {
                        label: "העברה ללא פעיל",
                        icon: <EyeOffMenuIcon className="text-ink-500" />,
                        onClick: async () => {
                          const result = await setClassStatus(
                            createClient(),
                            cls.id,
                            "inactive"
                          );
                          if (result.error) {
                            window.alert(result.error);
                            return;
                          }
                          router.refresh();
                        },
                      },
                    ]),
              ]}
              onDelete={async () => {
                const result = await deleteAdminRow(
                  createClient(),
                  "classes",
                  cls.id
                );
                if (!result.error) router.refresh();
                return result;
              }}
            />
          </div>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight text-ink-900">
            {cls.title}
          </h3>
          {(cls.category || cls.level || ageLabel) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cls.category && <Badge tone="brand">{cls.category}</Badge>}
              {cls.level && <Badge tone="info">{cls.level}</Badge>}
              {ageLabel && <Badge tone="neutral">{ageLabel}</Badge>}
            </div>
          )}
        </div>

        <dl className="space-y-1.5 text-sm">
          <DetailLine icon="👩‍🏫" label="מדריכה">
            {cls.instructors?.full_name ?? "לא שובצה"}
          </DetailLine>
          <DetailLine icon="🗓️" label="מועד">
            {scheduleLabel(cls)}
          </DetailLine>
          <DetailLine icon="💰" label="מחיר">
            {formatCurrency(cls.price)}
          </DetailLine>
        </dl>

        <div className="mt-auto space-y-2.5 border-t border-ink-100 pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-500">תפוסה</span>
            <span className="font-semibold text-ink-900">
              {registered}
              <span className="text-ink-400"> / {cls.capacity}</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full transition-all", barTone)}
              style={{ width: `${Math.min(100, ratio * 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <StatButton
              value={registered}
              label="נרשמים"
              onClick={() => onOpenPanel("enrollments")}
            />
            <StatButton
              value={waiting}
              label="בהמתנה"
              highlight={waiting > 0}
              onClick={() => onOpenPanel("waitlist")}
            />
            <StatButton
              value={rate === null ? "—" : `${rate}%`}
              label="נוכחות"
              onClick={() => onOpenPanel("attendance")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatButton({
  value,
  label,
  highlight = false,
  onClick,
}: {
  value: number | string;
  label: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-1 py-2 text-center transition-colors",
        highlight
          ? "bg-amber-50 hover:bg-amber-100"
          : "bg-ink-50 hover:bg-brand-100"
      )}
    >
      <span
        className={cn(
          "block text-base font-bold leading-tight",
          highlight ? "text-amber-700" : "text-ink-900"
        )}
      >
        {value}
      </span>
      <span className="block text-[11px] text-ink-500">{label}</span>
    </button>
  );
}

function DetailLine({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-sm">
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate text-ink-600">{children}</dd>
    </div>
  );
}

function ClassDetailPanel({
  cls,
  initialTab,
  onClose,
}: {
  cls: AdminClassRow;
  initialTab: PanelTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [assigning, setAssigning] = useState<AssignMode | null>(null);

  const enrollments = activeEnrollments(cls);
  const cancelled = cls.enrollments.filter((e) => e.status === "cancelled");
  const waiting = openWaitlist(cls);

  const tabs: { id: PanelTab; label: string; count: number | null }[] = [
    { id: "enrollments", label: "נרשמים", count: enrollments.length },
    { id: "waitlist", label: "המתנה", count: waiting.length },
    { id: "attendance", label: "נוכחות", count: null },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-panel-title"
        className={cn(
          "relative z-10 ms-auto flex h-full w-full max-w-lg flex-col",
          "border-s border-ink-100 bg-white shadow-card animate-fade-in"
        )}
      >
        <div className="bg-brand-gradient px-6 pb-6 pt-6 text-white">
          <div className="mb-5 flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25"
            >
              סגירה
            </button>
          </div>
          <h2 id="class-panel-title" className="font-display text-2xl font-bold">
            {cls.title}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {enrollments.length} מתוך {cls.capacity} מקומות · {scheduleLabel(cls)}
          </p>
        </div>

        <div className="flex gap-1.5 border-b border-ink-100 bg-ink-50/60 p-2">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                  active
                    ? "bg-white text-brand-700 shadow-soft"
                    : "text-ink-500 hover:bg-white/70 hover:text-ink-800"
                )}
              >
                {t.label}
                {t.count !== null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold",
                      active ? "bg-brand-100 text-brand-700" : "bg-ink-200 text-ink-600"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {tab === "enrollments" && (
            <>
              {enrollments.length === 0 ? (
                <EmptyState title="אין נרשמים לחוג זה" />
              ) : (
                enrollments.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))
              )}

              {cancelled.length > 0 && (
                <>
                  <p className="mt-3 text-sm font-semibold text-ink-500">
                    הרשמות שבוטלו ({cancelled.length})
                  </p>
                  {cancelled.map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      muted
                    />
                  ))}
                </>
              )}
            </>
          )}

          {tab === "waitlist" &&
            (waiting.length === 0 ? (
              <EmptyState
                title="אין ממתינים לחוג זה"
                description="כשהחוג יתמלא, הורים שיירשמו יופיעו כאן לפי סדר ההצטרפות."
              />
            ) : (
              waiting.map((entry, index) => (
                <WaitlistCard
                  key={entry.id}
                  entry={entry}
                  position={index + 1}
                  onAssign={() => setAssigning({ kind: "waitlist", entry })}
                />
              ))
            ))}

          {tab === "attendance" && <AttendanceTab records={cls.attendance} />}
        </div>
      </aside>

      {assigning && (
        <AssignToClassDialog
          cls={cls}
          mode={assigning}
          registered={enrollments.length}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}

function EnrollmentCard({
  enrollment,
  muted = false,
}: {
  enrollment: AdminClassEnrollment;
  muted?: boolean;
}) {
  const childName = enrollment.children?.full_name ?? "—";
  const age = calcAge(enrollment.children?.birth_date);
  const status = ENROLLMENT_STATUS[enrollment.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status];

  return (
    <Card className={cn("overflow-hidden", muted && "opacity-60")}>
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar name={childName} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-ink-900">
              {childName}
              {age !== null && (
                <span className="mr-1.5 text-xs font-normal text-ink-400">
                  גיל {age}
                </span>
              )}
            </p>
            <span className="shrink-0 text-xs text-ink-400">
              {formatDate(enrollment.created_at)}
            </span>
          </div>

          {enrollment.profiles && (
            <p className="mt-0.5 text-sm text-ink-500">
              הורה: {enrollment.profiles.full_name}
              {enrollment.profiles.phone && (
                <span dir="ltr" className="mr-1.5 text-ink-400">
                  {enrollment.profiles.phone}
                </span>
              )}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={payment.tone}>{payment.label}</Badge>
            {enrollment.admin_assigned && <Badge tone="info">שיבוץ ידני</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WaitlistCard({
  entry,
  position,
  onAssign,
}: {
  entry: AdminClassWaitlistEntry;
  position: number;
  onAssign: () => void;
}) {
  const childName = entry.children?.full_name ?? "—";
  const status = WAITLIST_STATUS[entry.status];

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 font-display text-sm font-bold text-amber-700">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-ink-900">{childName}</p>
            <span className="shrink-0 text-xs text-ink-400">
              {formatDate(entry.created_at)}
            </span>
          </div>

          {entry.profiles && (
            <p className="mt-0.5 text-sm text-ink-500">
              הורה: {entry.profiles.full_name}
              {entry.profiles.phone && (
                <span dir="ltr" className="mr-1.5 text-ink-400">
                  {entry.profiles.phone}
                </span>
              )}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Button type="button" size="sm" onClick={onAssign}>
              שיבוץ לחוג
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttendanceTab({ records }: { records: AdminClassAttendance[] }) {
  const byDate = useMemo(() => {
    const map = new Map<string, AdminClassAttendance[]>();
    for (const record of records) {
      const list = map.get(record.date);
      if (list) list.push(record);
      else map.set(record.date, [record]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  if (byDate.length === 0) {
    return (
      <EmptyState
        title="אין רישומי נוכחות"
        description="הנוכחות נרשמת על ידי המדריכה ותופיע כאן לפי תאריכים."
      />
    );
  }

  return (
    <>
      {byDate.map(([date, rows]) => {
        const present = rows.filter((r) => r.status === "present").length;
        const late = rows.filter((r) => r.status === "late").length;
        const absent = rows.filter((r) => r.status === "absent").length;

        return (
          <Card key={date} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
              <p className="font-semibold text-ink-900">{formatDate(date)}</p>
              <div className="flex flex-wrap gap-1.5">
                {present > 0 && <Badge tone="success">{present} נוכחים</Badge>}
                {late > 0 && <Badge tone="warning">{late} איחורים</Badge>}
                {absent > 0 && <Badge tone="danger">{absent} נעדרים</Badge>}
              </div>
            </div>
            <ul className="divide-y divide-ink-100">
              {rows.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm text-ink-700">
                    {record.children?.full_name ?? "—"}
                  </span>
                  <Badge tone={ATTENDANCE_STATUS[record.status].tone}>
                    {ATTENDANCE_STATUS[record.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}

function ClassSearchBar({
  query,
  onQueryChange,
  resultCount,
  totalCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">חיפוש חוגים</p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם חוג, מדריכה או קטגוריה
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="הקלידו שם חוג, מדריכה או קטגוריה..."
              className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
              aria-label="חיפוש חוגים"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute inset-y-0 end-3 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="ניקוי חיפוש"
              >
                <ClearIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <ButtonLink
            href="/admin/classes/new"
            className="h-12 shrink-0 px-6 sm:w-auto"
          >
            + חוג חדש
          </ButtonLink>
        </div>
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגים כל {totalCount} החוגים</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                חוגים מתוך {totalCount}
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
