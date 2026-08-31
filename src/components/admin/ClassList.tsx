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
  loadClassAttendance,
  loadClassRoster,
  type AdminRosterSession,
} from "@/lib/admin/classRoster";
import { isAppointmentClass } from "@/lib/classes/bookingMode";
import { dayLabelLong, todayInIsrael } from "@/lib/scheduling/monthGrid";
import {
  AssignToClassDialog,
  type AssignMode,
} from "@/components/admin/AssignToClassDialog";
import { CancelEnrollmentButton } from "@/components/admin/CancelEnrollmentButton";
import { ClassPreviewDialog } from "@/components/admin/ClassPreviewDialog";
import { ClassQuickEditDialog } from "@/components/admin/ClassQuickEditDialog";
import { CatalogOrderDialog } from "@/components/admin/CatalogOrderDialog";
import { ClassArrangementChooser } from "@/components/admin/ClassArrangementChooser";
import { FeaturedClassesDialog } from "@/components/admin/FeaturedClassesDialog";
import type { ClassInstructorOption } from "@/lib/admin/classInstructors";
import {
  attendanceRecordName,
  attendanceStudentsFromEnrollments,
  type AttendanceStudent,
} from "@/lib/attendance/students";
import { enrollmentHoldsSeat } from "@/lib/enrollment/holdsSeat";
import {
  participantDisplayName,
  participantSecondaryLine,
} from "@/lib/enrollment/participant";
import {
  SessionNotesList,
  SessionNotesWorkspace,
  useClassSessionNotesByDate,
} from "@/components/classes/SessionNotesPanel";
import { ClassAttendanceForm } from "@/components/instructor/ClassAttendanceForm";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createClient } from "@/lib/supabase/client";
import { setClassStatus } from "@/lib/admin/classStatus";
import {
  formatClassAudience,
  formatClassGenderPolicy,
  traineeNoun,
} from "@/lib/class-audience";
import {
  ATTENDANCE_STATUS,
  CLASS_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  DAYS_OF_WEEK,
  WAITLIST_STATUS,
  dayLabel,
} from "@/lib/constants";
import { formatClassOccupancy, isUnlimitedCapacity } from "@/lib/classes/capacity";
import {
  instructorTitle,
  unassignedInstructorLabel,
} from "@/lib/instructors/labels";
import { uniqueClassInstructorIds } from "@/lib/instructors/sessionInstructor";
import { parseBillingMonths } from "@/lib/finance/classPricing";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import type { PublicClass } from "@/types";
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
  weekly_slot_id: string | null;
  session_id?: string | null;
  class_sessions?: {
    session_date: string;
    start_time: string;
    end_time: string;
  } | null;
  created_at: string;
  children: { full_name: string; birth_date: string | null } | null;
  profiles: { full_name: string; phone: string | null } | null;
  payments?: {
    status: Enums<"payment_status">;
    payment_method: Enums<"payment_method"> | null;
    external_reference: string | null;
  }[] | null;
};

export type AdminClassWaitlistEntry = {
  id: string;
  class_id: string | null;
  parent_id: string;
  child_id: string | null;
  weekly_slot_id: string | null;
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
  profiles: { full_name: string } | null;
  instructors: { full_name: string } | null;
};

export type AdminClassSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  gender_policy: Enums<"class_gender_policy">;
  instructor_id: string | null;
  registeredCount: number;
  waitlistCount: number;
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
  billing_months: number | null;
  pick_one_slot: boolean;
  booking_mode?: "series" | "appointment";
  capacity: number | null;
  status: keyof typeof CLASS_STATUS;
  schedule_type: Enums<"schedule_type">;
  start_date: string | null;
  end_date: string | null;
  sibling_discount_tiers: Json | null;
  instructors: { full_name: string; gender: Enums<"gender_type"> | null } | null;
  instructor_id: string | null;
  interest_only: boolean;
  planned_session_count?: number | null;
  registeredCount: number;
  waitlistCount: number;
  slots: AdminClassSlot[];
  enrollments: AdminClassEnrollment[];
  waitlist: AdminClassWaitlistEntry[];
  attendance: AdminClassAttendance[];
};

export type PanelTab = "enrollments" | "waitlist" | "attendance";
export type AttendanceMode = "mark" | "history" | "notes";

interface ClassListProps {
  classes: AdminClassRow[];
  instructors: ClassInstructorOption[];
  featuredClassIds: string[];
  catalogClassIds: string[];
  publicClasses: PublicClass[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesClass(
  item: AdminClassRow,
  query: string,
  instructors: ClassInstructorOption[]
) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const instructorNames = classInstructorNames(item, instructors).join(" ");
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.category ?? "").includes(q) ||
    normalizeSearch(item.instructors?.full_name ?? "").includes(q) ||
    normalizeSearch(instructorNames).includes(q) ||
    (item.interest_only &&
      (q.includes("עניין") || q.includes("הרשמת")))
  );
}

function classInstructorIds(item: AdminClassRow) {
  return uniqueClassInstructorIds(
    item.instructor_id,
    item.slots.map((slot) => slot.instructor_id)
  );
}

function classInstructorNames(
  item: AdminClassRow,
  instructors: ClassInstructorOption[]
) {
  return classInstructorIds(item).map((id) => {
    if (id === item.instructor_id && item.instructors?.full_name) {
      return item.instructors.full_name;
    }
    return instructors.find((instructor) => instructor.id === id)?.full_name ?? "";
  });
}

function slotInstructorName(
  item: AdminClassRow,
  slot: AdminClassSlot,
  instructors: ClassInstructorOption[]
) {
  const id = slot.instructor_id ?? item.instructor_id;
  if (!id) return null;
  if (id === item.instructor_id && item.instructors?.full_name) {
    return item.instructors.full_name;
  }
  return instructors.find((instructor) => instructor.id === id)?.full_name ?? null;
}

/** נרשמים שתופסים מקום בפועל — ביטולים ואשראי שלא שולם לא נספרים. */
function activeEnrollments(item: AdminClassRow) {
  return item.enrollments.filter(
    (e) => e.status !== "cancelled" && enrollmentHoldsSeat(e)
  );
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

function adminClassPriceLabel(
  item: Pick<
    AdminClassRow,
    "price" | "billing_months" | "interest_only" | "booking_mode"
  >
) {
  if (item.interest_only) {
    return item.price > 0
      ? `${formatCurrency(item.price)} · מתוכנן`
      : "ללא תשלום";
  }
  if (item.booking_mode === "appointment") {
    return `${formatCurrency(item.price)} לטיפול`;
  }
  const months = parseBillingMonths(item.billing_months);
  if (!months) return formatCurrency(item.price);
  return `${formatCurrency(item.price)} לחודש × ${months}`;
}

function audienceLabel(item: AdminClassRow) {
  const parts = [
    formatClassGenderPolicy(item.gender_policy),
    formatClassAudience(item),
  ];
  return parts.filter(Boolean).join(" · ");
}

function defaultAppointmentDate(
  dates: string[],
  preferred: string | null | undefined,
  today: string
) {
  if (preferred && dates.includes(preferred)) return preferred;
  return dates.find((date) => date >= today) ?? dates[dates.length - 1] ?? "";
}

function scheduleLabel(item: AdminClassRow) {
  if (item.interest_only) {
    return item.planned_session_count
      ? `${item.planned_session_count} מפגשים מתוכננים`
      : "ללא מועד עדיין";
  }
  if (item.booking_mode === "appointment") {
    return "טיפול לפי תור";
  }
  if (item.day_of_week === null && !item.start_time) return "לוח זמנים לא הוגדר";
  const day = item.day_of_week === null ? null : `יום ${dayLabel(item.day_of_week)}`;
  const hours = item.start_time
    ? item.end_time
      ? `${formatTime(item.start_time)}–${formatTime(item.end_time)}`
      : formatTime(item.start_time)
    : null;
  return [day, hours].filter(Boolean).join(" · ");
}

export function ClassList({
  classes,
  instructors,
  featuredClassIds,
  catalogClassIds,
  publicClasses,
}: ClassListProps) {
  const [query, setQuery] = useState("");
  const [arrangeStep, setArrangeStep] = useState<
    null | "choose" | "featured" | "catalog"
  >(null);
  const [selected, setSelected] = useState<{
    cls: AdminClassRow;
    tab: PanelTab;
    attendanceMode?: AttendanceMode;
    weeklySlotId?: string | null;
  } | null>(null);
  const [previewed, setPreviewed] = useState<AdminClassRow | null>(null);
  const [manualAssign, setManualAssign] = useState<AdminClassRow | null>(null);
  const [quickEdit, setQuickEdit] = useState<AdminClassRow | null>(null);
  const filtered = useMemo(
    () => classes.filter((c) => matchesClass(c, query, instructors)),
    [classes, query, instructors]
  );

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
        onManageArrangement={() => setArrangeStep("choose")}
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
              instructors={instructors}
              featuredRank={
                featuredClassIds.includes(cls.id)
                  ? featuredClassIds.indexOf(cls.id) + 1
                  : null
              }
              onOpenPanel={(tab, attendanceMode, weeklySlotId) =>
                setSelected({ cls, tab, attendanceMode, weeklySlotId })
              }
              onPreview={() => setPreviewed(cls)}
              onAssign={() => setManualAssign(cls)}
              onQuickEdit={() => setQuickEdit(cls)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ClassDetailPanel
          cls={classes.find((c) => c.id === selected.cls.id) ?? selected.cls}
          initialTab={selected.tab}
          initialAttendanceMode={selected.attendanceMode ?? "mark"}
          weeklySlotId={selected.weeklySlotId ?? null}
          onClose={() => setSelected(null)}
        />
      )}

      {previewed && (
        <ClassPreviewDialog
          cls={previewed}
          registered={previewed.registeredCount}
          onClose={() => setPreviewed(null)}
        />
      )}

      {manualAssign && (
        <AssignToClassDialog
          cls={manualAssign}
          mode={{ kind: "manual" }}
          registered={manualAssign.registeredCount}
          onClose={() => setManualAssign(null)}
        />
      )}

      {quickEdit && (
        <ClassQuickEditDialog
          cls={classes.find((item) => item.id === quickEdit.id) ?? quickEdit}
          instructors={instructors}
          onClose={() => setQuickEdit(null)}
        />
      )}

      {arrangeStep === "choose" && (
        <ClassArrangementChooser
          onClose={() => setArrangeStep(null)}
          onPickFeatured={() => setArrangeStep("featured")}
          onPickCatalog={() => setArrangeStep("catalog")}
        />
      )}

      {arrangeStep === "featured" && (
        <FeaturedClassesDialog
          classes={classes}
          initialIds={featuredClassIds}
          onClose={() => setArrangeStep(null)}
        />
      )}

      {arrangeStep === "catalog" && (
        <CatalogOrderDialog
          classes={publicClasses}
          initialIds={catalogClassIds}
          onClose={() => setArrangeStep(null)}
        />
      )}
    </div>
  );
}

function ClassCard({
  cls,
  instructors,
  featuredRank,
  onOpenPanel,
  onPreview,
  onAssign,
  onQuickEdit,
}: {
  cls: AdminClassRow;
  instructors: ClassInstructorOption[];
  featuredRank: number | null;
  onOpenPanel: (
    tab: PanelTab,
    attendanceMode?: AttendanceMode,
    weeklySlotId?: string | null
  ) => void;
  onPreview: () => void;
  onAssign: () => void;
  onQuickEdit: () => void;
}) {
  const router = useRouter();
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const status = CLASS_STATUS[cls.status];
  const registered = cls.registeredCount;
  const waiting = cls.waitlistCount;
  const rate = attendanceRate(cls);
  const ageLabel = audienceLabel(cls);
  const appointment = isAppointmentClass(cls);
  const multiSlot = !appointment && cls.pick_one_slot && cls.slots.length > 1;
  const activeSlot = cls.slots.find((slot) => slot.id === activeSlotId) ?? null;

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
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--brand-gradient-soft)] text-4xl">
            🏊
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={status.tone} className="shadow-soft">
              {status.label}
            </Badge>
            {cls.interest_only && (
              <Badge tone="info" className="shadow-soft">
                הרשמת עניין
              </Badge>
            )}
            {cls.booking_mode === "appointment" && (
              <Badge tone="info" className="shadow-soft">
                תורים לטיפול
              </Badge>
            )}
            {featuredRank && (
              <Badge tone="brand" className="shadow-soft">
                מוביל {featuredRank}
              </Badge>
            )}
          </div>
          {/* בלי backdrop-filter/transform כאן — הם יוצרים containing block
              שכולא את תפריט הפעולות (position: fixed) בתוך ה-overflow-hidden של הכרטיס. */}
          <div className="rounded-lg bg-white/95 shadow-soft">
            <AdminRowActions
              editHref={`/admin/classes/${cls.id}/edit`}
              itemLabel={cls.title}
              onView={onPreview}
              extraMenuItems={[
                {
                  label: "עריכה מהירה",
                  icon: <QuickEditMenuIcon className="text-brand-600" />,
                  onClick: onQuickEdit,
                },
                {
                  label: "שכפול חוג",
                  icon: <DuplicateMenuIcon className="text-brand-600" />,
                  onClick: () =>
                    router.push(`/admin/classes/new?from=${cls.id}`),
                },
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
                          await revalidatePublicCatalog();
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
                          await revalidatePublicCatalog();
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
                if (!result.error) {
                  await revalidatePublicCatalog();
                  router.refresh();
                }
                return result;
              }}
            />
          </div>
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 p-4">
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
          <DetailLine
            icon="👩‍🏫"
            label={
              classInstructorIds(cls).length > 1
                ? "מדריכים"
                : instructorTitle(cls.instructors?.gender)
            }
          >
            {classInstructorNames(cls, instructors)
              .filter(Boolean)
              .join(" · ") ||
              unassignedInstructorLabel(cls.instructors?.gender)}
          </DetailLine>
          {cls.slots.length <= 1 && (
            <DetailLine icon="🗓️" label="מועד">
              {cls.slots[0]
                ? formatWeeklySlotLabel(
                    cls.slots[0].day_of_week,
                    cls.slots[0].start_time,
                    cls.slots[0].end_time,
                    cls.slots[0].gender_policy
                  )
                : scheduleLabel(cls)}
            </DetailLine>
          )}
          <DetailLine icon="💰" label="מחיר">
            {adminClassPriceLabel(cls)}
          </DetailLine>
        </dl>

        <div className="space-y-2.5 border-t border-ink-100 pt-3">
          {multiSlot ? (
            <div className="space-y-2.5">
              <AdminSlotPickerTrigger
                slotsCount={cls.slots.length}
                selectedSlot={activeSlot}
                onOpen={() => setSlotPickerOpen(true)}
              />
              {activeSlot && (
                <SlotStats
                  registered={activeSlot.registeredCount}
                  waiting={activeSlot.waitlistCount}
                  capacity={cls.capacity}
                  attendanceLabel="—"
                  onEnrollments={() =>
                    onOpenPanel("enrollments", undefined, activeSlot.id)
                  }
                  onWaitlist={() =>
                    onOpenPanel("waitlist", undefined, activeSlot.id)
                  }
                  onAttendance={() =>
                    onOpenPanel("attendance", "mark", activeSlot.id)
                  }
                />
              )}
              <Modal
                open={slotPickerOpen}
                onClose={() => setSlotPickerOpen(false)}
                title="בחירת מועד"
                description="בחרו מועד כדי לראות נרשמים, המתנה ונוכחות שלו."
              >
                <div className="space-y-2">
                  {cls.slots.map((slot) => {
                    const selected = activeSlotId === slot.id;
                    const instructorName = slotInstructorName(
                      cls,
                      slot,
                      instructors
                    );
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setActiveSlotId(slot.id);
                          setSlotPickerOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors",
                          selected
                            ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                            : "border-ink-100 bg-white hover:border-brand-200"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-base font-bold text-ink-900">
                            יום {DAYS_OF_WEEK[slot.day_of_week] ?? slot.day_of_week}
                          </span>
                          <span className="mt-0.5 block text-sm font-medium text-ink-700">
                            {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                            {" · "}
                            {formatClassGenderPolicy(slot.gender_policy)}
                            {instructorName ? ` · ${instructorName}` : ""}
                          </span>
                          <span className="mt-1 block text-xs text-ink-500">
                            {slot.registeredCount} נרשמים
                            {slot.waitlistCount > 0
                              ? ` · ${slot.waitlistCount} בהמתנה`
                              : ""}
                            {` · ${formatClassOccupancy(slot.registeredCount, cls.capacity)}`}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-ink-300"
                          )}
                        >
                          {selected && <Icon name="check" size={12} stroke={2.5} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Modal>
            </div>
          ) : (
            <SlotStats
              registered={registered}
              waiting={waiting}
              capacity={appointment ? null : cls.capacity}
              occupancyLabel={
                appointment ? `${registered} תורים שנקבעו` : undefined
              }
              attendanceLabel={rate === null ? "—" : `${rate}%`}
              onEnrollments={() =>
                onOpenPanel(
                  "enrollments",
                  undefined,
                  appointment ? undefined : cls.slots[0]?.id
                )
              }
              onWaitlist={() =>
                onOpenPanel(
                  "waitlist",
                  undefined,
                  appointment ? undefined : cls.slots[0]?.id
                )
              }
              onAttendance={() =>
                onOpenPanel(
                  "attendance",
                  "mark",
                  appointment ? undefined : cls.slots[0]?.id
                )
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSlotPickerTrigger({
  slotsCount,
  selectedSlot,
  onOpen,
}: {
  slotsCount: number;
  selectedSlot: AdminClassSlot | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-right transition-colors",
        selectedSlot
          ? "border-brand-200 bg-brand-50 hover:border-brand-300"
          : "border-dashed border-brand-300 bg-brand-50/50 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white",
          selectedSlot ? "bg-brand-600" : "bg-brand-500"
        )}
      >
        <Icon name={selectedSlot ? "check" : "calendar"} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        {selectedSlot ? (
          <>
            <span className="block text-[11px] font-medium text-brand-700">
              המועד שנבחר
            </span>
            <span className="mt-0.5 block text-sm font-bold text-ink-900">
              יום {DAYS_OF_WEEK[selectedSlot.day_of_week] ?? selectedSlot.day_of_week}
              {" · "}
              {formatTime(selectedSlot.start_time)}–{formatTime(selectedSlot.end_time)}
            </span>
          </>
        ) : (
          <>
            <span className="block text-sm font-bold text-ink-900">
              בחירת מועד
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              יש {slotsCount} מועדים · בחרו אחד כדי לראות נרשמים
            </span>
          </>
        )}
      </span>
      <span className="shrink-0 text-sm font-semibold text-brand-700">
        {selectedSlot ? "שינוי" : "בחירה"}
      </span>
    </button>
  );
}

function SlotStats({
  registered,
  waiting,
  capacity,
  occupancyLabel,
  attendanceLabel,
  onEnrollments,
  onWaitlist,
  onAttendance,
}: {
  registered: number;
  waiting: number;
  capacity: number | null;
  occupancyLabel?: string;
  attendanceLabel: string;
  onEnrollments: () => void;
  onWaitlist: () => void;
  onAttendance: () => void;
}) {
  const unlimited = isUnlimitedCapacity(capacity);
  const ratio =
    capacity != null && capacity > 0 ? registered / capacity : 0;
  const barTone =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.75 ? "bg-amber-500" : "bg-aqua-500";

  return (
    <>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-500">תפוסה</span>
        <span className="font-semibold text-ink-900">
          {occupancyLabel ?? formatClassOccupancy(registered, capacity)}
        </span>
      </div>
      {!unlimited && (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-all", barTone)}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        <StatButton value={registered} label="נרשמים" onClick={onEnrollments} />
        <StatButton
          value={waiting}
          label="בהמתנה"
          highlight={waiting > 0}
          onClick={onWaitlist}
        />
        <StatButton
          value={attendanceLabel}
          label="נוכחות"
          onClick={onAttendance}
        />
      </div>
    </>
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

export function ClassDetailPanel({
  cls,
  initialTab,
  initialAttendanceMode = "mark",
  weeklySlotId = null,
  initialSessionDate = null,
  onClose,
}: {
  cls: AdminClassRow;
  initialTab: PanelTab;
  initialAttendanceMode?: AttendanceMode;
  weeklySlotId?: string | null;
  initialSessionDate?: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [attendanceMode, setAttendanceMode] =
    useState<AttendanceMode>(initialAttendanceMode);
  const [assigning, setAssigning] = useState<AssignMode | null>(null);
  const [listQuery, setListQuery] = useState("");
  const appointment = isAppointmentClass(cls);
  const [selectedDate, setSelectedDate] = useState(initialSessionDate ?? "");
  const [roster, setRoster] = useState<{
    enrollments: AdminClassEnrollment[];
    waitlist: AdminClassWaitlistEntry[];
    sessions: AdminRosterSession[];
  } | null>(null);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [attendance, setAttendance] = useState<AdminClassAttendance[]>(
    cls.attendance
  );

  useEffect(() => {
    let cancelled = false;
    setRoster(null);
    setRosterLoading(true);
    loadClassRoster(cls.id).then((data) => {
      if (cancelled) return;
      setRoster(data);
      setRosterLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cls.id]);

  function refreshRoster() {
    setRosterLoading(true);
    loadClassRoster(cls.id).then((data) => {
      setRoster(data);
      setRosterLoading(false);
    });
  }

  useEffect(() => {
    let cancelled = false;
    setAttendance(cls.attendance);
    loadClassAttendance(cls.id).then((rows) => {
      if (!cancelled) setAttendance(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [cls.id, cls.attendance]);

  useEffect(() => {
    if (assigning) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [assigning, onClose]);

  const rosterClass = roster
    ? { ...cls, enrollments: roster.enrollments, waitlist: roster.waitlist }
    : cls;

  const sessions = roster?.sessions ?? [];
  const sessionDates = useMemo(() => {
    const dates = [...new Set(sessions.map((session) => session.session_date))];
    dates.sort();
    return dates;
  }, [sessions]);

  useEffect(() => {
    if (!appointment || sessionDates.length === 0) return;
    setSelectedDate((current) =>
      current && sessionDates.includes(current)
        ? current
        : defaultAppointmentDate(
            sessionDates,
            initialSessionDate,
            todayInIsrael()
          )
    );
  }, [appointment, sessionDates, initialSessionDate]);

  const daySessions = useMemo(
    () =>
      appointment && selectedDate
        ? sessions.filter((session) => session.session_date === selectedDate)
        : [],
    [appointment, selectedDate, sessions]
  );

  const selectedSlot =
    !appointment && weeklySlotId
      ? cls.slots.find((slot) => slot.id === weeklySlotId) ?? null
      : null;

  const enrollments = useMemo(() => {
    const rows = activeEnrollments(rosterClass).filter((row) => {
      if (appointment) {
        if (!selectedDate) return true;
        if (row.class_sessions?.session_date) {
          return row.class_sessions.session_date === selectedDate;
        }
        return daySessions.some((session) => session.id === row.session_id);
      }
      return weeklySlotId ? row.weekly_slot_id === weeklySlotId : true;
    });
    return [...rows].sort((a, b) =>
      (a.children?.full_name ?? "").localeCompare(
        b.children?.full_name ?? "",
        "he"
      )
    );
  }, [appointment, daySessions, rosterClass, selectedDate, weeklySlotId]);

  const cancelled = useMemo(() => {
    const rows = rosterClass.enrollments.filter((e) => {
      if (e.status !== "cancelled") return false;
      if (appointment) {
        if (!selectedDate) return true;
        if (e.class_sessions?.session_date) {
          return e.class_sessions.session_date === selectedDate;
        }
        return daySessions.some((session) => session.id === e.session_id);
      }
      return !weeklySlotId || e.weekly_slot_id === weeklySlotId;
    });
    return [...rows].sort((a, b) =>
      (a.children?.full_name ?? "").localeCompare(
        b.children?.full_name ?? "",
        "he"
      )
    );
  }, [
    appointment,
    daySessions,
    rosterClass.enrollments,
    selectedDate,
    weeklySlotId,
  ]);

  const waiting = useMemo(
    () =>
      openWaitlist(rosterClass).filter((row) =>
        weeklySlotId ? row.weekly_slot_id === weeklySlotId : true
      ),
    [rosterClass, weeklySlotId]
  );

  const students = useMemo(
    () => attendanceStudentsFromEnrollments(enrollments),
    [enrollments]
  );

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
      attendance.length >= 8);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4">
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
        className="relative z-10 flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card animate-fade-in"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 bg-brand-gradient px-5 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <h2
              id="class-panel-title"
              className="break-words font-display text-xl font-bold sm:text-2xl"
            >
              {cls.title}
            </h2>
            <p className="mt-0.5 text-sm text-white/80">
              {appointment && selectedDate
                ? `${enrollments.length} מתוך ${daySessions.length} · ${dayLabelLong(selectedDate)}`
                : `${formatClassOccupancy(
                    rosterLoading
                      ? selectedSlot?.registeredCount ?? cls.registeredCount
                      : enrollments.length,
                    cls.capacity
                  )}${
                    selectedSlot
                      ? ` · ${formatWeeklySlotLabel(
                          selectedSlot.day_of_week,
                          selectedSlot.start_time,
                          selectedSlot.end_time,
                          selectedSlot.gender_policy
                        )}`
                      : ` · ${scheduleLabel(cls)}`
                  }`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="-me-1.5 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
          >
            <Icon name="x" size={18} />
          </button>
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

        {appointment && sessionDates.length > 0 && (
          <AppointmentDateBar
            dates={sessionDates}
            selectedDate={selectedDate}
            onChange={setSelectedDate}
          />
        )}

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
          {rosterLoading && (tab === "enrollments" || tab === "waitlist") ? (
            <p className="px-5 py-10 text-center text-sm text-ink-400">
              טוען את הרשימה...
            </p>
          ) : tab === "enrollments" ? (
            appointment ? (
              <AppointmentEnrollmentsTab
                sessions={daySessions}
                enrollments={filteredEnrollments}
                cancelled={filteredCancelled}
                searching={Boolean(q)}
                classTitle={cls.title}
                onRemoved={refreshRoster}
              />
            ) : (
              <EnrollmentsTab
                active={filteredEnrollments}
                cancelled={filteredCancelled}
                totalActive={enrollments.length}
                searching={Boolean(q)}
                classTitle={cls.title}
                onRemoved={refreshRoster}
              />
            )
          ) : tab === "waitlist" &&
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
              attendance={attendance}
              students={students}
              weeklySlotId={appointment ? null : weeklySlotId}
              initialSessionDate={
                appointment ? selectedDate || initialSessionDate : initialSessionDate
              }
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
          onClose={() => {
            setAssigning(null);
            refreshRoster();
          }}
        />
      )}
    </div>
  );
}

function AppointmentDateBar({
  dates,
  selectedDate,
  onChange,
}: {
  dates: string[];
  selectedDate: string;
  onChange: (date: string) => void;
}) {
  const index = dates.indexOf(selectedDate);
  const prev = index > 0 ? dates[index - 1] : null;
  const next = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-ink-100 bg-white px-4 py-2.5">
      <button
        type="button"
        onClick={() => prev && onChange(prev)}
        disabled={!prev}
        aria-label="תאריך קודם"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-30"
      >
        <Icon name="chevron" size={18} className="rotate-180" />
      </button>
      <Select
        value={selectedDate}
        onChange={(e) => onChange(e.target.value)}
        aria-label="בחירת תאריך"
        className="h-9"
      >
        {dates.map((date) => (
          <option key={date} value={date}>
            {dayLabelLong(date)}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => next && onChange(next)}
        disabled={!next}
        aria-label="תאריך הבא"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-30"
      >
        <Icon name="chevron" size={18} />
      </button>
    </div>
  );
}

function AppointmentEnrollmentsTab({
  sessions,
  enrollments,
  cancelled,
  searching,
  classTitle,
  onRemoved,
}: {
  sessions: AdminRosterSession[];
  enrollments: AdminClassEnrollment[];
  cancelled: AdminClassEnrollment[];
  searching: boolean;
  classTitle: string;
  onRemoved: () => void;
}) {
  const bySessionId = new Map(
    enrollments
      .filter((row) => row.session_id)
      .map((row) => [row.session_id as string, row])
  );
  const visibleSessions = searching
    ? sessions.filter((session) => bySessionId.has(session.id))
    : sessions;

  if (visibleSessions.length === 0 && cancelled.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          title={searching ? "לא נמצאו נרשמים לפי החיפוש" : "אין תורים בתאריך הזה"}
        />
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-ink-100 border-b border-ink-100 bg-white">
        {visibleSessions.map((session) => {
          const enrollment = bySessionId.get(session.id);
          return (
            <li key={session.id}>
              <p className="px-4 pt-2.5 text-[11px] font-semibold tabular-nums text-ink-400">
                <span dir="ltr">
                  {formatTime(session.start_time)}–{formatTime(session.end_time)}
                </span>
              </p>
              {enrollment ? (
                <EnrollmentRow
                  enrollment={enrollment}
                  hideSession
                  classTitle={classTitle}
                  onRemoved={onRemoved}
                />
              ) : (
                <p className="px-4 pb-3 pt-1 text-sm text-ink-400">פנוי</p>
              )}
            </li>
          );
        })}
      </ul>
      {cancelled.length > 0 && (
        <div className="mt-3">
          <p className="sticky top-0 z-[1] bg-ink-50/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400 backdrop-blur-sm">
            הרשמות שבוטלו · {cancelled.length}
          </p>
          <ul className="divide-y divide-ink-100 border-y border-ink-100 bg-white">
            {cancelled.map((enrollment) => (
              <EnrollmentRow key={enrollment.id} enrollment={enrollment} muted />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnrollmentsTab({
  active,
  cancelled,
  totalActive,
  searching,
  classTitle,
  onRemoved,
}: {
  active: AdminClassEnrollment[];
  cancelled: AdminClassEnrollment[];
  totalActive: number;
  searching: boolean;
  classTitle: string;
  onRemoved: () => void;
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
              classTitle={classTitle}
              onRemoved={onRemoved}
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
  hideSession = false,
  classTitle,
  onRemoved,
}: {
  enrollment: AdminClassEnrollment;
  index?: number;
  muted?: boolean;
  hideSession?: boolean;
  classTitle?: string;
  onRemoved?: () => void;
}) {
  const childName = enrollment.children?.full_name;
  const displayName = participantDisplayName(
    childName,
    enrollment.profiles?.full_name,
    "—"
  );
  const age = childName ? calcAge(enrollment.children?.birth_date) : null;
  const status = ENROLLMENT_STATUS[enrollment.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[enrollment.payment_status];
  const parentLine = participantSecondaryLine(
    childName,
    enrollment.profiles?.full_name,
    enrollment.profiles?.phone
  );

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
      <Avatar name={displayName} className="h-8 w-8 text-[11px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
            {displayName}
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
        {!hideSession && enrollment.class_sessions && (
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {formatDate(enrollment.class_sessions.session_date)} ·{" "}
            {formatTime(enrollment.class_sessions.start_time)}–
            {formatTime(enrollment.class_sessions.end_time)}
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
        {!muted && classTitle && onRemoved && (
          <CancelEnrollmentButton
            enrollmentId={enrollment.id}
            title={classTitle}
            participantName={displayName}
            compact
            onRemoved={onRemoved}
          />
        )}
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
  const childName = entry.children?.full_name;
  const displayName = participantDisplayName(
    childName,
    entry.profiles?.full_name,
    "—"
  );
  const status = WAITLIST_STATUS[entry.status];
  const parentLine = participantSecondaryLine(
    childName,
    entry.profiles?.full_name,
    entry.profiles?.phone
  );

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50/80">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold tabular-nums text-amber-700">
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
            {displayName}
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
  attendance,
  students,
  weeklySlotId = null,
  initialSessionDate = null,
  mode,
  onModeChange,
  query,
}: {
  cls: AdminClassRow;
  attendance: AdminClassAttendance[];
  students: AttendanceStudent[];
  weeklySlotId?: string | null;
  initialSessionDate?: string | null;
  mode: AttendanceMode;
  onModeChange: (mode: AttendanceMode) => void;
  query: string;
}) {
  const records = attendance;
  const notesByDate = useClassSessionNotesByDate(cls.id);
  const q = normalizeSearch(query);
  const genderPolicy =
    (weeklySlotId
      ? cls.slots.find((slot) => slot.id === weeklySlotId)?.gender_policy
      : null) ?? cls.gender_policy;

  const byDate = useMemo(() => {
    const filtered = q
      ? records.filter((r) =>
          personSearchHaystack(
            r.children?.full_name,
            r.profiles?.full_name
          ).includes(q)
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
          attendanceRecordName(
            a.children?.full_name,
            a.profiles?.full_name
          ).localeCompare(
            attendanceRecordName(
              b.children?.full_name,
              b.profiles?.full_name
            ),
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
              בחרו מפגש וסמנו נוכחות לכל {traineeNoun(genderPolicy, 1)}.
            </p>
          </div>
          <ClassAttendanceForm
            classId={cls.id}
            instructorId={cls.instructor_id}
            students={students}
            weeklySlotId={weeklySlotId}
            genderPolicy={genderPolicy}
            preferredDate={initialSessionDate}
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
                        {attendanceRecordName(
                          record.children?.full_name,
                          record.profiles?.full_name
                        )}
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
  onManageArrangement,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  onManageArrangement: () => void;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">חיפוש חוגים</p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם חוג, מדריך או קטגוריה
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
              placeholder="הקלידו שם חוג, מדריך או קטגוריה..."
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
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-12 px-5 sm:w-auto"
              onClick={onManageArrangement}
            >
              סידור חוגים
            </Button>
            <ButtonLink
              href="/admin/classes/new"
              className="h-12 px-6 sm:w-auto"
            >
              + חוג חדש
            </ButtonLink>
          </div>
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

function DuplicateMenuIcon({ className }: { className?: string }) {
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
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function QuickEditMenuIcon({ className }: { className?: string }) {
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
      <path d="M4 21v-7M4 10V3" />
      <path d="M12 21v-9M12 8V3" />
      <path d="M20 21v-5M20 12V3" />
      <path d="M2 14h4M10 8h4M18 16h4" />
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
