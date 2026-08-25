"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons/Icon";
import { cn } from "@/utils/cn";
import {
  DAYS_OF_WEEK,
  parentEnrollmentDisplayBadge,
  WAITLIST_STATUS,
} from "@/lib/constants";
import {
  displayGenderPolicy,
  formatClassGenderPolicy,
  pickOneSlotTraineeHint,
  pickOneSlotTraineeShort,
} from "@/lib/class-audience";
import { formatTime } from "@/utils/format";
import { joinClassWaitlist } from "@/lib/enrollment/actions";
import {
  formatAgeRange,
  getAgeEligibility,
  hasAgeRestriction,
  type AgeEligibility,
} from "@/lib/enrollment/ageValidation";
import { countFamilyChildrenInCategory } from "@/lib/enrollment/categorySiblings";
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";
import { ClassEnrollmentCheckoutDialog } from "./ClassEnrollmentCheckoutDialog";
import { Modal } from "@/components/ui/Modal";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import type { PublicClassSlot } from "@/types";
import type { Enums } from "@/types/database.types";

type Child = {
  id: string;
  full_name: string;
  birth_date: string | null;
  hasHealthDeclaration: boolean;
};

type ExistingEnrollment = {
  id: string;
  child_id: string | null;
  status: Enums<"enrollment_status">;
  payment_status: Enums<"enrollment_payment_status">;
  children: { full_name: string } | null;
  payments?: { payment_method: Enums<"payment_method"> | null; status: Enums<"payment_status"> }[] | null;
};

type WaitlistEntry = {
  id: string;
  child_id: string | null;
  status: Enums<"waitlist_status">;
  children: { full_name: string } | null;
};

interface ClassEnrollmentActionsProps {
  classId: string;
  classTitle: string;
  classPrice: number;
  proration: ProratedClassPrice;
  billingMonths?: number | null;
  ageMin: number | null;
  ageMax: number | null;
  soldOut: boolean;
  ended?: boolean;
  availableSpots: number;
  kids: Child[];
  enrollments: ExistingEnrollment[];
  waitlist: WaitlistEntry[];
  siblingTiers: SiblingDiscountTier[];
  /** אחים שכבר רשומים לאותה קטגוריה — גם בחוג אחר. */
  categorySiblingIds: string[];
  pickOneSlot?: boolean;
  slots?: PublicClassSlot[];
  classGenderPolicy?: Enums<"class_gender_policy">;
}

export function ClassEnrollmentActions({
  classId,
  classTitle,
  classPrice,
  proration,
  billingMonths,
  ageMin,
  ageMax,
  soldOut,
  ended = false,
  availableSpots,
  kids,
  enrollments,
  waitlist,
  siblingTiers,
  categorySiblingIds,
  pickOneSlot = false,
  slots = [],
  classGenderPolicy = "mixed",
}: ClassEnrollmentActionsProps) {
  const router = useRouter();
  const traineeGender = displayGenderPolicy(
    classGenderPolicy,
    slots.map((slot) => slot.gender_policy)
  );
  const ageRestricted = hasAgeRestriction(ageMin, ageMax);
  const eligibilityByChildId = useMemo(
    () =>
      new Map(
        kids.map((child) => {
          const eligibility: AgeEligibility = child.hasHealthDeclaration
            ? getAgeEligibility(
                child.birth_date,
                ageMin,
                ageMax,
                child.full_name
              )
            : {
                eligible: false,
                age: null,
                ageLabel: null,
                reason: `יש למלא הצהרת בריאות עבור ${child.full_name} באזור האישי לפני הרשמה לחוג.`,
              };
          return [child.id, eligibility] as const;
        })
      ),
    [kids, ageMin, ageMax]
  );
  const enrolledChildIds = useMemo(
    () =>
      new Set(
        enrollments.map((e) => e.child_id).filter(Boolean) as string[]
      ),
    [enrollments]
  );
  const waitlistedChildIds = useMemo(
    () =>
      new Set(
        waitlist.map((w) => w.child_id).filter(Boolean) as string[]
      ),
    [waitlist]
  );
  const availableChildren = useMemo(
    () =>
      kids.filter(
        (c) =>
          !enrolledChildIds.has(c.id) &&
          !waitlistedChildIds.has(c.id) &&
          (eligibilityByChildId.get(c.id)?.eligible ?? true)
      ),
    [kids, enrolledChildIds, waitlistedChildIds, eligibilityByChildId]
  );

  const ineligibleChildren = useMemo(
    () =>
      kids.filter(
        (c) =>
          !enrolledChildIds.has(c.id) &&
          !waitlistedChildIds.has(c.id) &&
          !(eligibilityByChildId.get(c.id)?.eligible ?? true)
      ),
    [kids, enrolledChildIds, waitlistedChildIds, eligibilityByChildId]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [weeklySlotId, setWeeklySlotId] = useState<string>(
    () => (pickOneSlot && slots.length === 1 ? slots[0].id : "")
  );

  const selectedSlot = slots.find((slot) => slot.id === weeklySlotId) ?? null;
  const needsSlot = pickOneSlot && slots.length > 0 && !selectedSlot;
  const slotSpots = selectedSlot ? selectedSlot.available : availableSpots;
  const slotSoldOut = pickOneSlot
    ? Boolean(selectedSlot && selectedSlot.available <= 0)
    : soldOut;

  const maxSelectable = useMemo(() => {
    if (needsSlot || slotSoldOut) return availableChildren.length;
    return Math.min(availableChildren.length, Math.max(0, slotSpots));
  }, [availableChildren.length, needsSlot, slotSoldOut, slotSpots]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [enrollmentsExpanded, setEnrollmentsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(availableChildren.slice(0, maxSelectable).map((c) => c.id));
    setError(null);
  }, [availableChildren, maxSelectable]);

  const selectedChildren = availableChildren.filter((c) =>
    selectedIds.includes(c.id)
  );
  const enrolledSiblings = countFamilyChildrenInCategory(
    categorySiblingIds,
    selectedIds
  );

  const atSelectionLimit = !slotSoldOut && selectedIds.length >= maxSelectable;

  function toggleChild(childId: string) {
    const eligibility = eligibilityByChildId.get(childId);
    if (eligibility && !eligibility.eligible) {
      setError(eligibility.reason ?? "הילד/ה אינו/אינה בטווח הגילאים של החוג.");
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(childId)) {
        setError(null);
        return prev.filter((id) => id !== childId);
      }
      if (!slotSoldOut && prev.length >= maxSelectable) {
        setError(
          maxSelectable <= 0
            ? "אין מקומות פנויים בחוג."
            : `ניתן לבחור עד ${maxSelectable} ${maxSelectable === 1 ? "ילד/ה" : "ילדים"} — מספר המקומות הפנויים בחוג.`
        );
        return prev;
      }
      setError(null);
      return [...prev, childId];
    });
  }

  function toggleAll() {
    if (selectedIds.length === maxSelectable && maxSelectable > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableChildren.slice(0, maxSelectable).map((c) => c.id));
    }
    setError(null);
  }

  async function handleWaitlistJoin() {
    if (pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד לחוג.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("נא לבחור לפחות ילד/ה אחד/ת.");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await joinClassWaitlist({
      classId,
      childIds: selectedIds,
      weeklySlotId: pickOneSlot ? weeklySlotId || null : null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "לא הצלחנו לשמור את רשימת המתנה.");
      return;
    }

    router.refresh();
  }

  function handleContinue() {
    if (pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד לחוג.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("נא לבחור לפחות ילד/ה אחד/ת.");
      return;
    }
    if (!slotSoldOut && selectedIds.length > maxSelectable) {
      setError(
        maxSelectable <= 0
          ? "אין מקומות פנויים במועד זה."
          : `נותרו רק ${maxSelectable} מקומות פנויים במועד זה.`
      );
      return;
    }
    setError(null);
    if (slotSoldOut) {
      void handleWaitlistJoin();
      return;
    }
    setCheckoutOpen(true);
  }

  if (kids.length === 0 && !ended) {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm text-ink-600">
          כדי להירשם לחוג, הוסיפו תחילה ילד/ה לפרופיל המשפחתי.
        </p>
        <ButtonLink href="/parent/dashboard#children" size="lg" className="w-full">
          הוספת ילד/ה
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 space-y-4">
        {enrollments.length > 0 && (
          <CollapsibleSummaryCard
            id="class-enrollments-list"
            tone="aqua"
            count={enrollments.length}
            title="כבר רשומים לחוג זה"
            subtitle={
              enrollments.length === 1
                ? "ילד/ה אחד/ת"
                : `${enrollments.length} ילדים`
            }
            expanded={enrollmentsExpanded}
            onToggle={() => setEnrollmentsExpanded((open) => !open)}
          >
            <ul className="divide-y divide-aqua-100 px-3.5 pb-3 pt-1 sm:px-4">
              {enrollments.map((e) => {
                const payment = e.payments?.[0];
                const statusBadge = parentEnrollmentDisplayBadge(
                  e.payment_status,
                  payment?.payment_method,
                  {
                    enrollmentStatus: e.status,
                    chargeStatus: payment?.status ?? null,
                  }
                );

                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-2"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-ink-900">
                      {e.children?.full_name ?? "ילד/ה"}
                    </span>
                    <Badge tone={statusBadge.tone} className="shrink-0">
                      {statusBadge.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CollapsibleSummaryCard>
        )}

        {waitlist.length > 0 && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-800">
              ברשימת המתנה
            </p>
            <ul className="mt-2 space-y-2">
              {waitlist.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium text-ink-900">
                    {w.children?.full_name ?? "ילד/ה"}
                  </span>
                  <Badge tone={WAITLIST_STATUS[w.status].tone}>
                    {WAITLIST_STATUS[w.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!ended && (availableChildren.length > 0 || ineligibleChildren.length > 0) ? (
          <div className="space-y-3">
            {pickOneSlot && slots.length > 0 && (
              <SlotPickerTrigger
                slotsCount={slots.length}
                selectedSlot={selectedSlot}
                traineeGender={traineeGender}
                onOpen={() => setSlotPickerOpen(true)}
              />
            )}

            {enrollments.length > 0 && availableChildren.length > 0 && (
              <p className="text-sm text-ink-600">
                ניתן להירשם גם עבור ילד/ה נוסף/ת:
              </p>
            )}

            {ageRestricted && (
              <p className="rounded-2xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
                החוג מיועד ל{formatAgeRange(ageMin, ageMax)}.
              </p>
            )}

            {!slotSoldOut && maxSelectable < availableChildren.length && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                {maxSelectable <= 0
                  ? "אין מקומות פנויים בחוג."
                  : `נותרו ${maxSelectable} מקומות פנויים — ניתן לבחור עד ${maxSelectable} ${maxSelectable === 1 ? "ילד/ה" : "ילדים"}.`}
              </p>
            )}

            <ChildPickerTrigger
              selectedChildren={selectedChildren}
              availableCount={availableChildren.length}
              eligibilityByChildId={eligibilityByChildId}
              onOpen={() => setChildPickerOpen(true)}
            />

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={loading || (!needsSlot && selectedIds.length === 0)}
              onClick={() => {
                if (needsSlot) {
                  setError(null);
                  setSlotPickerOpen(true);
                  return;
                }
                handleContinue();
              }}
            >
              {loading
                ? "שומר..."
                : needsSlot
                  ? "נא לבחור מועד"
                  : slotSoldOut
                    ? `הצטרפות לרשימת המתנה (${selectedIds.length})`
                    : selectedIds.length > 1
                      ? `המשך לתשלום (${selectedIds.length} ילדים)`
                      : "המשך לתשלום"}
            </Button>
          </div>
        ) : (
          enrollments.length === 0 &&
          waitlist.length === 0 && (
            <p className="text-sm text-ink-500">
              {ended
                ? "לא ניתן להירשם לחוג שהסתיים."
                : ineligibleChildren.length > 0
                  ? "אף אחד מהילדים אינו בטווח הגילאים של החוג."
                  : "כל הילדים כבר רשומים לחוג זה."}
            </p>
          )
        )}
      </div>

      {pickOneSlot && slots.length > 0 && (
        <Modal
          open={slotPickerOpen}
          onClose={() => setSlotPickerOpen(false)}
          title="בחירת יום ושעה"
          description={pickOneSlotTraineeHint(traineeGender)}
        >
          <div className="space-y-2">
            {slots.map((slot) => {
              const selected = weeklySlotId === slot.id;
              const full = slot.available <= 0;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setWeeklySlotId(slot.id);
                    setError(null);
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
                    </span>
                    <span className="mt-1 block text-xs text-ink-500">
                      {full
                        ? "המועד מלא — אפשר להצטרף לרשימת המתנה"
                        : `${slot.available} מקומות פנויים`}
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
      )}

      <Modal
        open={childPickerOpen}
        onClose={() => setChildPickerOpen(false)}
        title="בחירת ילדים"
        description={
          availableChildren.length === 0
            ? "אין ילדים מתאימים להרשמה לחוג זה."
            : maxSelectable < availableChildren.length
              ? `ניתן לבחור עד ${maxSelectable} ${maxSelectable === 1 ? "ילד/ה" : "ילדים"} לפי המקומות הפנויים.`
              : "סמנו את הילדים שנרשמים לחוג."
        }
      >
        <div className="space-y-3">
          {availableChildren.length > 1 && maxSelectable > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                {selectedIds.length === maxSelectable
                  ? "ביטול הכל"
                  : maxSelectable < availableChildren.length
                    ? `בחירת ${maxSelectable} הראשונים`
                    : "בחירת כולם"}
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {availableChildren.map((child) => {
              const checked = selectedIds.includes(child.id);
              const disabled = atSelectionLimit && !checked;
              const eligibility = eligibilityByChildId.get(child.id);
              return (
                <li key={child.id}>
                  <label
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                      disabled
                        ? "cursor-not-allowed border-ink-100 bg-ink-50 opacity-60"
                        : checked
                          ? "cursor-pointer border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                          : "cursor-pointer border-ink-100 bg-white hover:border-brand-200"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleChild(child.id)}
                      className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink-900">
                        {child.full_name}
                      </span>
                      {eligibility?.ageLabel && (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          גיל {eligibility.ageLabel}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-ink-300"
                      )}
                    >
                      {checked && <Icon name="check" size={12} stroke={2.5} />}
                    </span>
                  </label>
                </li>
              );
            })}
            {ineligibleChildren.map((child) => {
              const eligibility = eligibilityByChildId.get(child.id);
              return (
                <li key={child.id}>
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3.5 opacity-75">
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-ink-700">
                        {child.full_name}
                        {eligibility?.ageLabel && (
                            <span className="mr-1.5 text-xs font-normal text-ink-400">
                              גיל {eligibility.ageLabel}
                            </span>
                          )}
                      </span>
                      {eligibility?.reason && (
                        <p className="mt-1 text-xs text-amber-700">
                          {eligibility.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            className="w-full"
            onClick={() => setChildPickerOpen(false)}
          >
            סיום בחירה
          </Button>
        </div>
      </Modal>

      {!slotSoldOut && !ended && (
        <ClassEnrollmentCheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          classId={classId}
          classTitle={classTitle}
          unitPrice={classPrice}
          proration={proration}
          billingMonths={billingMonths}
          selectedChildren={selectedChildren}
          siblingTiers={siblingTiers}
          enrolledSiblings={enrollments.length}
          weeklySlotId={weeklySlotId || null}
          weeklySlotLabel={
            selectedSlot
              ? formatWeeklySlotLabel(
                  selectedSlot.day_of_week,
                  selectedSlot.start_time,
                  selectedSlot.end_time,
                  selectedSlot.gender_policy
                )
              : null
          }
        />
      )}
    </>
  );
}

function SlotPickerTrigger({
  slotsCount,
  selectedSlot,
  traineeGender,
  onOpen,
}: {
  slotsCount: number;
  selectedSlot: PublicClassSlot | null;
  traineeGender: Enums<"class_gender_policy">;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors",
        selectedSlot
          ? "border-brand-200 bg-brand-50 hover:border-brand-300"
          : "border-dashed border-brand-300 bg-brand-50/50 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white",
          selectedSlot ? "bg-brand-600" : "bg-brand-500"
        )}
      >
        <Icon name={selectedSlot ? "check" : "calendar"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        {selectedSlot ? (
          <>
            <span className="block text-xs font-medium text-brand-700">
              המועד שנבחר
            </span>
            <span className="mt-0.5 block text-sm font-bold text-ink-900">
              יום {DAYS_OF_WEEK[selectedSlot.day_of_week] ?? selectedSlot.day_of_week}
              {" · "}
              {formatTime(selectedSlot.start_time)}–{formatTime(selectedSlot.end_time)}
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {formatClassGenderPolicy(selectedSlot.gender_policy)}
              {" · "}
              {selectedSlot.available > 0
                ? `${selectedSlot.available} מקומות פנויים`
                : "המועד מלא"}
            </span>
          </>
        ) : (
          <>
            <span className="block text-sm font-bold text-ink-900">
              בחירת יום ושעה
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              יש {slotsCount} מועדים בשבוע · {pickOneSlotTraineeShort(traineeGender)}
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

function ChildPickerTrigger({
  selectedChildren,
  availableCount,
  eligibilityByChildId,
  onOpen,
}: {
  selectedChildren: Child[];
  availableCount: number;
  eligibilityByChildId: Map<string, AgeEligibility>;
  onOpen: () => void;
}) {
  const selected = selectedChildren.length > 0;
  const first = selectedChildren[0];
  const firstAge = first
    ? eligibilityByChildId.get(first.id)?.ageLabel
    : null;
  const title = !selected
    ? "בחירת ילדים"
    : selectedChildren.length === 1
      ? first.full_name
      : selectedChildren.map((child) => child.full_name).join(", ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-colors",
        selected
          ? "border-brand-200 bg-brand-50 hover:border-brand-300"
          : "border-dashed border-brand-300 bg-brand-50/50 hover:border-brand-400 hover:bg-brand-50"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white",
          selected ? "bg-brand-600" : "bg-brand-500"
        )}
      >
        <Icon name={selected ? "check" : "child"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        {selected ? (
          <>
            <span className="block text-xs font-medium text-brand-700">
              {selectedChildren.length === 1 ? "הילד/ה שנבחר/ה" : "הילדים שנבחרו"}
            </span>
            <span className="mt-0.5 block truncate text-sm font-bold text-ink-900">
              {title}
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {selectedChildren.length === 1
                ? firstAge != null
                  ? `גיל ${firstAge}`
                  : "נרשם לחוג"
                : `${selectedChildren.length} ילדים נבחרו`}
            </span>
          </>
        ) : (
          <>
            <span className="block text-sm font-bold text-ink-900">
              בחירת ילדים
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {availableCount === 0
                ? "אין ילדים מתאימים לחוג זה"
                : availableCount === 1
                  ? "בחרו את הילד/ה שנרשם/ת לחוג"
                  : `יש ${availableCount} ילדים בחשבון · בחרו מי נרשם`}
            </span>
          </>
        )}
      </span>
      <span className="shrink-0 text-sm font-semibold text-brand-700">
        {selected ? "שינוי" : "בחירה"}
      </span>
    </button>
  );
}

export function GuestEnrollmentActions({
  classId,
  soldOut,
  ended = false,
}: {
  classId: string;
  soldOut: boolean;
  ended?: boolean;
}) {
  if (ended) {
    return null;
  }

  const loginHref = `/login?redirect=${encodeURIComponent(`/classes/${classId}`)}`;
  const registerHref = soldOut
    ? `/register?class=${classId}&waitlist=1`
    : `/register?class=${classId}`;

  return (
    <div className="mt-5 space-y-3">
      <ButtonLink href={loginHref} size="lg" className="w-full">
        {soldOut ? "התחברות לרשימת המתנה" : "התחברות להרשמה"}
      </ButtonLink>
      <ButtonLink href={registerHref} variant="outline" className="w-full">
        {soldOut ? "פתיחת חשבון והצטרפות" : "פתיחת חשבון חדש"}
      </ButtonLink>
      <p className="text-center text-xs text-ink-400">
        {soldOut
          ? "יש להתחבר או לפתוח חשבון כדי להצטרף לרשימת המתנה"
          : "יש להתחבר או לפתוח חשבון כדי להירשם לחוג"}
      </p>
    </div>
  );
}

export function NonParentEnrollmentNotice({ homeHref }: { homeHref: string }) {
  return (
    <div className="mt-5 space-y-3">
      <p className="text-sm text-ink-600">
        הרשמה לחוגים זמינה לחשבונות הורים בלבד.
      </p>
      <ButtonLink href={homeHref} variant="outline" className="w-full">
        חזרה לאזור האישי
      </ButtonLink>
    </div>
  );
}

function CollapsibleSummaryCard({
  id,
  tone,
  count,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  tone: "aqua" | "brand";
  count: number;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const styles = {
    aqua: {
      card: "border-aqua-200/90 bg-gradient-to-bl from-aqua-50 via-white to-aqua-50/40",
      hover: "hover:bg-aqua-50/70",
      badge: "bg-aqua-600",
      title: "text-aqua-900",
      subtitle: "text-aqua-700/75",
      chevron: "text-aqua-700 ring-aqua-200/80",
      divider: "border-aqua-200/60",
    },
    brand: {
      card: "border-brand-200/90 bg-gradient-to-bl from-brand-50 via-white to-brand-50/40",
      hover: "hover:bg-brand-50/70",
      badge: "bg-brand-600",
      title: "text-brand-900",
      subtitle: "text-brand-700/75",
      chevron: "text-brand-700 ring-brand-200/80",
      divider: "border-brand-200/60",
    },
  }[tone];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm",
        styles.card
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={id}
        className={cn(
          "flex w-full items-center gap-3 px-3.5 py-3 text-right transition-colors sm:px-4 sm:py-3.5",
          styles.hover
        )}
      >
        <span className="min-w-0 flex-1 text-right">
          <span className="inline-flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums text-white shadow-sm",
                styles.badge
              )}
            >
              {count}
            </span>
            <span className="flex flex-col items-start gap-0.5">
              <span
                className={cn(
                  "text-sm font-semibold leading-tight sm:text-[0.9375rem]",
                  styles.title
                )}
              >
                {title}
              </span>
              <span
                className={cn("text-xs leading-tight", styles.subtitle)}
              >
                {subtitle}
              </span>
            </span>
          </span>
        </span>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 transition-transform duration-200",
            styles.chevron,
            expanded && "rotate-180"
          )}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      </button>

      <div
        id={id}
        className={cn(
          "grid border-t transition-[grid-template-rows] duration-200 ease-out",
          styles.divider,
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
