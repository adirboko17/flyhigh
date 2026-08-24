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
import {
  SessionNotesList,
  SessionNotesWorkspace,
  useClassSessionNotesByDate,
} from "@/components/classes/SessionNotesPanel";
import { ClassAttendanceForm } from "@/components/instructor/ClassAttendanceForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { setClassStatus } from "@/lib/admin/classStatus";
import {
  formatClassAudience,
  formatClassGenderPolicy,
} from "@/lib/class-audience";
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
  gender_policy: Enums<"class_gender_policy">;
  audience_type: Enums<"class_audience_type">;
  age_min: number | null;
  age_max: number | null;
  grade_min: number | null;
  grade_max: number | null;
  price: number;
  capacity: number;
  status: keyof typeof CLASS_STATUS;
  schedule_type: Enums<"schedule_type">;
  start_date: string | null;
  end_date: string | null;
  sibling_discount_tiers: Json | null;
  instructors: { full_name: string } | null;
  instructor_id: string | null;
  enrollments: AdminClassEnrollment[];
  waitlist: AdminClassWaitlistEntry[];
  attendance: AdminClassAttendance[];
};

type PanelTab = "enrollments" | "waitlist" | "attendance";
type AttendanceMode = "mark" | "history" | "notes";

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

function audienceLabel(item: AdminClassRow) {
  const parts = [
    formatClassGenderPolicy(item.gender_policy),
    formatClassAudience(item),
  ];
  return parts.filter(Boolean).join(" · ");
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
    attendanceMode?: AttendanceMode;
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
              onOpenPanel={(tab, attendanceMode) =>
                setSelected({ cls, tab, attendanceMode })
              }
              onPreview={() => setPreviewed(cls)}
              onAssign={() => setManualAssign(cls)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ClassDetailPanel
          cls={classes.find((c) => c.id === selected.cls.id) ?? selected.cls}
          initialTab={selected.tab}
          initialAttendanceMode={selected.attendanceMode ?? "mark"}
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
  onOpenPanel: (tab: PanelTab, attendanceMode?: AttendanceMode) => void;
  onPreview: () => void;
  onAssign: () => void;
}) {
  const router = useRouter();
  const status = CLASS_STATUS[cls.status];
  const registered = activeEnrollments(cls).length;
  const waiting = openWaitlist(cls).length;
  const rate = attendanceRate(cls);
  const ratio = cls.capacity > 0 ? registered / cls.capacity : 0;
  const ageLabel = audienceLabel(cls);

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
                {
                  label: "סימון נוכחות",
                  icon: <AttendanceMenuIcon className="text-brand-600" />,
                  onClick: () => onOpenPanel("attendance", "mark"),
                },
                {
                  label: "הערות מפגש",
                  icon: <NotesMenuIcon className="text-brand-600" />,
                  onClick: () => onOpenPanel("attendance", "notes"),
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
              onClick={() => onOpenPanel("attendance", "mark")}
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

function personSearchHaystack(...parts: Array<string | null | undefined>) {
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

function ClassDetailPanel({
  cls,
  initialTab,
  initialAttendanceMode = "mark",
  onClose,
}: {
  cls: AdminClassRow;
  initialTab: PanelTab;
  initialAttendanceMode?: AttendanceMode;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [attendanceMode, setAttendanceMode] =
    useState<AttendanceMode>(initialAttendanceMode);
  const [assigning, setAssigning] = useState<AssignMode | null>(null);
  const [listQuery, setListQuery] = useState("");

  const enrollments = useMemo(() => {
    const rows = activeEnrollments(cls);
    return [...rows].sort((a, b) =>
      (a.children?.full_name ?? "").localeCompare(
        b.children?.full_name ?? "",
        "he"
      )
    );
  }, [cls]);

  const cancelled = useMemo(() => {
    const rows = cls.enrollments.filter((e) => e.status === "cancelled");
    return [...rows].sort((a, b) =>
      (a.children?.full_name ?? "").localeCompare(
        b.children?.full_name ?? "",
        "he"
      )
    );
  }, [cls.enrollments]);

  const waiting = openWaitlist(cls);

  const students = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; full_name: string }[] = [];
    for (const e of enrollments) {
      if (!e.child_id || !e.children?.full_name || seen.has(e.child_id)) continue;
      seen.add(e.child_id);
      list.push({ id: e.child_id, full_name: e.children.full_name });
    }
    return list;
  }, [enrollments]);

  const tabs: { id: PanelTab; label: string; count: number | null }[] = [
    { id: "enrollments", label: "נרשמים", count: enrollments.length },
    { id: "waitlist", label: "המתנה", count: waiting.length },
    { id: "attendance", label: "נוכחות", count: null },
  ];

  useEffect(() => {
    setListQuery("");
  }, [tab, cls.id]);

  useEffect(() => {
    setAttendanceMode(initialAttendanceMode);
  }, [cls.id, initialAttendanceMode]);

  const q = normalizeSearch(listQuery);

  const filteredEnrollments = useMemo(() => {
    if (!q) return enrollments;
    return enrollments.filter((e) =>
      personSearchHaystack(
        e.children?.full_name,
        e.profiles?.full_name,
        e.profiles?.phone
      ).includes(q)
    );
  }, [enrollments, q]);

  const filteredCancelled = useMemo(() => {
    if (!q) return cancelled;
    return cancelled.filter((e) =>
      personSearchHaystack(
        e.children?.full_name,
        e.profiles?.full_name,
        e.profiles?.phone
      ).includes(q)
    );
  }, [cancelled, q]);

  const filteredWaiting = useMemo(() => {
    if (!q) return waiting;
    return waiting.filter((e) =>
      personSearchHaystack(
        e.children?.full_name,
        e.profiles?.full_name,
        e.profiles?.phone
      ).includes(q)
    );
  }, [waiting, q]);

  const showListSearch =
    (tab === "enrollments" && enrollments.length + cancelled.length >= 6) ||
    (tab === "waitlist" && waiting.length >= 6) ||
    (tab === "attendance" &&
      attendanceMode === "history" &&
      cls.attendance.length >= 8);

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
          "relative z-10 ms-auto flex h-full w-full max-w-xl flex-col",
          "border-s border-ink-100 bg-white shadow-card animate-fade-in"
        )}
      >
        <div className="shrink-0 bg-brand-gradient px-5 pb-5 pt-5 text-white sm:px-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25"
            >
              סגירה
            </button>
          </div>
          <h2
            id="class-panel-title"
            className="break-words font-display text-xl font-bold sm:text-2xl"
          >
            {cls.title}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {enrollments.length} מתוך {cls.capacity} מקומות · {scheduleLabel(cls)}
          </p>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-ink-100 bg-ink-50/70 p-1.5">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all sm:text-sm",
                  active
                    ? "bg-white text-brand-700 shadow-soft"
                    : "text-ink-500 hover:bg-white/70 hover:text-ink-800"
                )}
              >
                {t.label}
                {t.count !== null && (
                  <span
                    className={cn(
                      "min-w-[1.25rem] rounded-md px-1.5 text-center text-[11px] font-bold tabular-nums",
                      active
                        ? "bg-brand-100 text-brand-700"
                        : "bg-ink-200/80 text-ink-600"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {showListSearch && (
          <div className="shrink-0 border-b border-ink-100 bg-white px-4 py-2.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-400" />
              <Input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="חיפוש לפי שם או טלפון..."
                className="h-9 border-ink-100 bg-ink-50/60 ps-9 text-sm shadow-none"
                aria-label="חיפוש ברשימה"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-ink-50/40">
          {tab === "enrollments" && (
            <EnrollmentsTab
              active={filteredEnrollments}
              cancelled={filteredCancelled}
              totalActive={enrollments.length}
              searching={Boolean(q)}
            />
          )}

          {tab === "waitlist" &&
            (waiting.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="אין ממתינים לחוג זה"
                  description="כשהחוג יתמלא, הורים שיירשמו יופיעו כאן לפי סדר ההצטרפות."
                />
              </div>
            ) : filteredWaiting.length === 0 ? (
              <div className="p-5">
                <EmptyState title="לא נמצאו ממתינים לפי החיפוש" />
              </div>
            ) : (
              <ul className="divide-y divide-ink-100 border-b border-ink-100 bg-white">
                {filteredWaiting.map((entry) => {
                  const position =
                    waiting.findIndex((w) => w.id === entry.id) + 1;
                  return (
                    <WaitlistRow
                      key={entry.id}
                      entry={entry}
                      position={position}
                      onAssign={() =>
                        setAssigning({ kind: "waitlist", entry })
                      }
                    />
                  );
                })}
              </ul>
            ))}

          {tab === "attendance" && (
            <AttendanceTab
              cls={cls}
              students={students}
              mode={attendanceMode}
              onModeChange={setAttendanceMode}
              query={listQuery}
            />
          )}
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

function EnrollmentsTab({
  active,
  cancelled,
  totalActive,
  searching,
}: {
  active: AdminClassEnrollment[];
  cancelled: AdminClassEnrollment[];
  totalActive: number;
  searching: boolean;
}) {
  if (totalActive === 0 && cancelled.length === 0 && !searching) {
    return (
      <div className="p-5">
        <EmptyState title="אין נרשמים לחוג זה" />
      </div>
    );
  }

  if (active.length === 0 && cancelled.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title="לא נמצאו נרשמים לפי החיפוש" />
      </div>
    );
  }

  return (
    <div>
      {active.length > 0 && (
        <ul className="divide-y divide-ink-100 border-b border-ink-100 bg-white">
          {active.map((enrollment, index) => (
            <EnrollmentRow
              key={enrollment.id}
              enrollment={enrollment}
              index={index + 1}
            />
          ))}
        </ul>
      )}

      {cancelled.length > 0 && (
        <div className="mt-3">
          <p className="sticky top-0 z-[1] bg-ink-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400 backdrop-blur-sm">
            הרשמות שבוטלו · {cancelled.length}
          </p>
          <ul className="divide-y divide-ink-100 border-y border-ink-100 bg-white">
            {cancelled.map((enrollment) => (
              <EnrollmentRow
                key={enrollment.id}
                enrollment={enrollment}
                muted
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnrollmentRow({
  enrollment,
  index,
  muted = false,
}: {
  enrollment: AdminClassEnrollment;
  index?: number;
  muted?: boolean;
}) {
  const childName = enrollment.children?.full_name ?? "—";
  const age = calcAge(enrollment.children?.birth_date);
  const status = ENROLLMENT_STATUS[enrollment.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status];
  const parentLine = enrollment.profiles
    ? [enrollment.profiles.full_name, enrollment.profiles.phone]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50/80",
        muted && "opacity-55"
      )}
    >
      {typeof index === "number" ? (
        <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-ink-300">
          {index}
        </span>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <Avatar name={childName} className="h-8 w-8 text-[11px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
            {childName}
          </p>
          {age !== null && (
            <span className="shrink-0 text-[11px] text-ink-400">גיל {age}</span>
          )}
        </div>
        {parentLine && (
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {parentLine}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-1">
          <Badge tone={payment.tone} className="px-1.5 py-0 text-[10px]">
            {payment.label}
          </Badge>
          {(enrollment.status !== "active" || enrollment.admin_assigned) && (
            <>
              {enrollment.status !== "active" && (
                <Badge tone={status.tone} className="px-1.5 py-0 text-[10px]">
                  {status.label}
                </Badge>
              )}
              {enrollment.admin_assigned && (
                <Badge tone="info" className="px-1.5 py-0 text-[10px]">
                  ידני
                </Badge>
              )}
            </>
          )}
        </div>
        <span className="text-[10px] tabular-nums text-ink-400">
          {formatDate(enrollment.created_at)}
        </span>
      </div>
    </li>
  );
}

function WaitlistRow({
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
  const parentLine = entry.profiles
    ? [entry.profiles.full_name, entry.profiles.phone]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50/80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold tabular-nums text-amber-700">
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
            {childName}
          </p>
          <Badge tone={status.tone} className="px-1.5 py-0 text-[10px]">
            {status.label}
          </Badge>
        </div>
        {parentLine && (
          <p className="mt-0.5 truncate text-xs text-ink-500">{parentLine}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={onAssign}
          className="h-7 px-2.5 text-xs"
        >
          שיבוץ
        </Button>
        <span className="text-[10px] tabular-nums text-ink-400">
          {formatDate(entry.created_at)}
        </span>
      </div>
    </li>
  );
}

function AttendanceTab({
  cls,
  students,
  mode,
  onModeChange,
  query,
}: {
  cls: AdminClassRow;
  students: { id: string; full_name: string }[];
  mode: AttendanceMode;
  onModeChange: (mode: AttendanceMode) => void;
  query: string;
}) {
  const records = cls.attendance;
  const notesByDate = useClassSessionNotesByDate(cls.id);
  const q = normalizeSearch(query);

  const byDate = useMemo(() => {
    const filtered = q
      ? records.filter((r) =>
          personSearchHaystack(r.children?.full_name).includes(q)
        )
      : records;

    const map = new Map<string, AdminClassAttendance[]>();
    for (const record of filtered) {
      const list = map.get(record.date);
      if (list) list.push(record);
      else map.set(record.date, [record]);
    }

    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => [
        date,
        [...rows].sort((a, b) =>
          (a.children?.full_name ?? "").localeCompare(
            b.children?.full_name ?? "",
            "he"
          )
        ),
      ] as const);
  }, [records, q]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-[1] flex gap-1 border-b border-ink-100 bg-white/95 p-2 backdrop-blur-sm">
        {(
          [
            { id: "mark", label: "סימון" },
            { id: "notes", label: "הערות" },
            { id: "history", label: "היסטוריה" },
          ] as const
        ).map((item) => {
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-100 text-brand-800"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {mode === "mark" ? (
        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-base font-bold text-ink-900">
              סימון נוכחות
            </h3>
            <p className="mt-0.5 text-sm text-ink-500">
              בחרו מפגש וסמנו נוכחות לכל תלמיד רשום.
            </p>
          </div>
          <ClassAttendanceForm
            classId={cls.id}
            instructorId={cls.instructor_id}
            students={students}
            emptySessionsHint="לא נמצאו מפגשים מתוכננים. עדכנו את לוח המפגשים בעריכת החוג."
          />
        </div>
      ) : mode === "notes" ? (
        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-base font-bold text-ink-900">
              הערות מפגש
            </h3>
            <p className="mt-0.5 text-sm text-ink-500">
              דיווח פציעה או הערה כללית לכל מפגש. גלוי למדריכה ולמנהל בלבד.
            </p>
          </div>
          <SessionNotesWorkspace classId={cls.id} />
        </div>
      ) : records.length === 0 ? (
        <div className="p-5">
          <EmptyState
            title="אין רישומי נוכחות"
            description="עדיין לא סומנה נוכחות לחוג זה. אפשר לסמן דרך לשונית הסימון."
          />
        </div>
      ) : byDate.length === 0 ? (
        <div className="p-5">
          <EmptyState title="לא נמצאו רשומות לפי החיפוש" />
        </div>
      ) : (
        <div className="space-y-3 p-3 sm:p-4">
          {byDate.map(([date, rows]) => {
            const present = rows.filter((r) => r.status === "present").length;
            const late = rows.filter((r) => r.status === "late").length;
            const absent = rows.filter((r) => r.status === "absent").length;

            return (
              <section
                key={date}
                className="overflow-hidden rounded-xl border border-ink-100 bg-white"
              >
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/70 px-3 py-2">
                  <p className="text-sm font-semibold text-ink-900">
                    {formatDate(date)}
                  </p>
                  <p className="text-[11px] tabular-nums text-ink-500">
                    {[
                      present > 0 ? `${present} נוכחים` : null,
                      late > 0 ? `${late} איחור` : null,
                      absent > 0 ? `${absent} נעדרים` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </header>
                <ul className="divide-y divide-ink-50">
                  {rows.map((record) => (
                    <li
                      key={record.id}
                      className="flex items-center justify-between gap-3 px-3 py-1.5"
                    >
                      <span className="min-w-0 truncate text-sm text-ink-800">
                        {record.children?.full_name ?? "—"}
                      </span>
                      <Badge
                        tone={ATTENDANCE_STATUS[record.status].tone}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {ATTENDANCE_STATUS[record.status].label}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {(notesByDate[date]?.length ?? 0) > 0 && (
                  <div className="border-t border-ink-100 px-3 py-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-ink-500">
                      הערות מפגש
                    </p>
                    <SessionNotesList notes={notesByDate[date] ?? []} />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
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

function AttendanceMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function NotesMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
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
