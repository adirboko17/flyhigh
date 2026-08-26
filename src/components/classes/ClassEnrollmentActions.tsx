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
  childEligibilityError,
  displayGenderPolicy,
  formatClassGenderPolicy,
  formatGradeRange,
  genderMismatchError,
  pickOneSlotTraineeHint,
  pickOneSlotTraineeShort,
} from "@/lib/class-audience";
import { formatTime } from "@/utils/format";
import {
  joinClassWaitlist,
  registerInterestForClass,
} from "@/lib/enrollment/actions";
import {
  formatAgeRange,
  getAgeEligibility,
  hasAgeRestriction,
  type AgeEligibility,
} from "@/lib/enrollment/ageValidation";
import { useCart } from "@/components/cart/CartProvider";
import { countFamilyChildrenInCategory } from "@/lib/enrollment/categorySiblings";
import { PARENT_TRAINEE_ID } from "@/lib/enrollment/trainees";
import {
  calculateOrderTotal,
  type SiblingDiscountTier,
} from "@/lib/finance/siblingDiscount";
import { Modal } from "@/components/ui/Modal";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import { formatWeeklySlotLabel } from "@/lib/scheduling/classSchedule";
import type { PublicClassSlot } from "@/types";
import type { Enums } from "@/types/database.types";

type Child = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender?: Enums<"gender_type"> | null;
  school_grade?: number | null;
  grade_school_year?: number | null;
  hasHealthDeclaration: boolean;
};

type ParentTrainee = {
  fullName: string;
  birthDate: string | null;
  gender?: Enums<"gender_type"> | null;
};

type Trainee = Child & { kind: "parent" | "child" };

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
  audienceType?: Enums<"class_audience_type">;
  gradeMin?: number | null;
  gradeMax?: number | null;
  soldOut: boolean;
  ended?: boolean;
  availableSpots: number;
  parent: ParentTrainee;
  kids: Child[];
  enrollments: ExistingEnrollment[];
  waitlist: WaitlistEntry[];
  siblingTiers: SiblingDiscountTier[];
  /** אחים שכבר רשומים לאותה קטגוריה — גם בחוג אחר. */
  categorySiblingIds: string[];
  pickOneSlot?: boolean;
  slots?: PublicClassSlot[];
  classGenderPolicy?: Enums<"class_gender_policy">;
  interestOnly?: boolean;
}

export function ClassEnrollmentActions({
  classId,
  classTitle,
  classPrice,
  proration,
  billingMonths,
  ageMin,
  ageMax,
  audienceType = "age",
  gradeMin = null,
  gradeMax = null,
  soldOut,
  ended = false,
  availableSpots,
  parent,
  kids,
  enrollments,
  waitlist,
  siblingTiers,
  categorySiblingIds,
  pickOneSlot = false,
  slots = [],
  classGenderPolicy = "mixed",
  interestOnly = false,
}: ClassEnrollmentActionsProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const traineeGender = displayGenderPolicy(
    classGenderPolicy,
    slots.map((slot) => slot.gender_policy)
  );
  const ageRestricted = hasAgeRestriction(ageMin, ageMax);
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
  const parentAlreadyTaken =
    enrollments.some((enrollment) => enrollment.child_id == null) ||
    waitlist.some((entry) => entry.child_id == null);
  const parentTrainee = useMemo<Trainee>(
    () => ({
      id: PARENT_TRAINEE_ID,
      full_name: parent.fullName,
      birth_date: parent.birthDate,
      gender: parent.gender,
      hasHealthDeclaration: true,
      kind: "parent",
    }),
    [parent.fullName, parent.birthDate, parent.gender]
  );

  const [weeklySlotId, setWeeklySlotId] = useState<string>(
    () => (pickOneSlot && slots.length === 1 ? slots[0].id : "")
  );
  const selectedSlot = slots.find((slot) => slot.id === weeklySlotId) ?? null;
  const effectiveGender = selectedSlot?.gender_policy ?? traineeGender;

  const gradeRangeLabel = formatGradeRange(gradeMin, gradeMax);
  const gradeRestricted = audienceType === "grade";

  const eligibilityByChildId = useMemo(() => {
    const audienceFields = {
      gender_policy: effectiveGender,
      audience_type: audienceType,
      age_min: ageMin,
      age_max: ageMax,
      grade_min: gradeMin,
      grade_max: gradeMax,
    };
    const map = new Map<string, AgeEligibility>();
    const parentAge = getAgeEligibility(
      parent.birthDate,
      ageMin,
      ageMax,
      parent.fullName
    );
    const parentGenderError = genderMismatchError(
      parent.fullName,
      parent.gender,
      effectiveGender
    );
    const parentReason =
      parentGenderError ??
      (gradeRestricted
        ? `החוג מיועד ל${gradeRangeLabel ?? "כיתות מסוימות"}, ולא להורה.`
        : null);
    map.set(
      PARENT_TRAINEE_ID,
      parentReason
        ? {
            eligible: false,
            age: parentAge.age,
            ageLabel: parentAge.ageLabel,
            reason: parentReason,
          }
        : parentAge
    );
    for (const child of kids) {
      const age = getAgeEligibility(
        child.birth_date,
        ageMin,
        ageMax,
        child.full_name
      );
      if (!child.hasHealthDeclaration) {
        map.set(child.id, {
          eligible: false,
          age: age.age,
          ageLabel: age.ageLabel,
          reason: `יש למלא הצהרת בריאות עבור ${child.full_name} באזור האישי לפני הרשמה לחוג.`,
        });
        continue;
      }
      const audienceError = childEligibilityError(audienceFields, {
        full_name: child.full_name,
        gender: child.gender ?? null,
        birth_date: child.birth_date,
        school_grade: child.school_grade ?? null,
        grade_school_year: child.grade_school_year ?? null,
      });
      if (audienceError) {
        map.set(child.id, {
          eligible: false,
          age: age.age,
          ageLabel: age.ageLabel,
          reason: audienceError,
        });
        continue;
      }
      map.set(child.id, age);
    }
    return map;
  }, [
    kids,
    parent.birthDate,
    parent.fullName,
    parent.gender,
    ageMin,
    ageMax,
    effectiveGender,
    audienceType,
    gradeMin,
    gradeMax,
    gradeRestricted,
    gradeRangeLabel,
  ]);

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
  const parentEligible =
    !parentAlreadyTaken &&
    (eligibilityByChildId.get(PARENT_TRAINEE_ID)?.eligible ?? true);
  const availableTrainees = useMemo<Trainee[]>(
    () => [
      ...(parentEligible ? [parentTrainee] : []),
      ...availableChildren.map((child) => ({ ...child, kind: "child" as const })),
    ],
    [parentEligible, parentTrainee, availableChildren]
  );
  const ineligibleTrainees = useMemo<Trainee[]>(
    () => [
      ...(!parentAlreadyTaken && !parentEligible ? [parentTrainee] : []),
      ...ineligibleChildren.map((child) => ({ ...child, kind: "child" as const })),
    ],
    [parentAlreadyTaken, parentEligible, parentTrainee, ineligibleChildren]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const needsSlot = pickOneSlot && slots.length > 0 && !selectedSlot;
  const slotSpots = selectedSlot ? selectedSlot.available : availableSpots;
  const slotSoldOut = pickOneSlot
    ? Boolean(selectedSlot && selectedSlot.available <= 0)
    : soldOut;

  const maxSelectable = useMemo(() => {
    if (needsSlot || slotSoldOut) return availableTrainees.length;
    return Math.min(availableTrainees.length, Math.max(0, slotSpots));
  }, [availableTrainees.length, needsSlot, slotSoldOut, slotSpots]);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const [interestConfirmOpen, setInterestConfirmOpen] = useState(false);
  const [enrollmentsExpanded, setEnrollmentsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const allowed = new Set(availableTrainees.map((trainee) => trainee.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => allowed.has(id)).slice(0, maxSelectable);
      return next.length === prev.length && next.every((id, i) => id === prev[i])
        ? prev
        : next;
    });
  }, [availableTrainees, maxSelectable]);

  const selectedTrainees = availableTrainees.filter((trainee) =>
    selectedIds.includes(trainee.id)
  );
  const selectedChildIds = selectedIds.filter((id) => id !== PARENT_TRAINEE_ID);
  const includeSelf = selectedIds.includes(PARENT_TRAINEE_ID);
  const enrolledSiblings = countFamilyChildrenInCategory(
    categorySiblingIds,
    selectedChildIds
  );

  const atSelectionLimit = !slotSoldOut && selectedIds.length >= maxSelectable;

  function toggleChild(childId: string) {
    const eligibility = eligibilityByChildId.get(childId);
    if (eligibility && !eligibility.eligible) {
      setError(eligibility.reason ?? "המתאמן/ת אינו/אינה בטווח הגילאים של החוג.");
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
            ? "החוג מלא."
            : "אין מספיק מקומות בחוג להרשמה של כל המתאמנים שנבחרו."
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
      setSelectedIds(availableTrainees.slice(0, maxSelectable).map((c) => c.id));
    }
    setError(null);
  }

  async function handleInterestRegister() {
    if (selectedIds.length === 0) {
      setError("נא לבחור מתאמן או מתאמנת.");
      return;
    }
    const eligibilityError = selectedTrainees
      .map((trainee) => eligibilityByChildId.get(trainee.id))
      .find((row) => row && !row.eligible)?.reason;
    if (eligibilityError) {
      setError(eligibilityError);
      return;
    }

    setError(null);
    setLoading(true);
    const result = await registerInterestForClass({
      classId,
      childIds: selectedChildIds,
      includeSelf,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setInterestConfirmOpen(false);
    setSelectedIds([]);
    router.refresh();
  }

  async function handleWaitlistJoin() {
    if (pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד לחוג.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("נא לבחור מתאמן או מתאמנת.");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await joinClassWaitlist({
      classId,
      childIds: selectedChildIds,
      includeSelf,
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
    if (interestOnly) {
      if (slotSoldOut) {
        void handleWaitlistJoin();
        return;
      }
      if (selectedIds.length === 0) {
        setError("נא לבחור מתאמן או מתאמנת.");
        return;
      }
      const eligibilityError = selectedTrainees
        .map((trainee) => eligibilityByChildId.get(trainee.id))
        .find((row) => row && !row.eligible)?.reason;
      if (eligibilityError) {
        setError(eligibilityError);
        return;
      }
      setError(null);
      setInterestConfirmOpen(true);
      return;
    }
    if (pickOneSlot && !weeklySlotId) {
      setError("נא לבחור מועד לחוג.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("נא לבחור מתאמן או מתאמנת.");
      return;
    }
    if (!slotSoldOut && selectedIds.length > maxSelectable) {
      setError(
        maxSelectable <= 0
          ? "המועד מלא."
          : "אין מספיק מקומות במועד זה להרשמה של כל המתאמנים שנבחרו."
      );
      return;
    }
    const eligibilityError = selectedTrainees
      .map((trainee) => eligibilityByChildId.get(trainee.id))
      .find((row) => row && !row.eligible)?.reason;
    if (eligibilityError) {
      setError(eligibilityError);
      return;
    }

    setError(null);
    if (slotSoldOut) {
      void handleWaitlistJoin();
      return;
    }

    const order = calculateOrderTotal(
      classPrice,
      selectedIds.length,
      siblingTiers,
      enrolledSiblings + selectedIds.length
    );
    const result = addItem({
      kind: "class",
      productId: classId,
      title: classTitle,
      listTotal: order.total,
      childIds: selectedChildIds,
      includeSelf,
      participantNames: selectedTrainees.map((trainee) => trainee.full_name),
      weeklySlotId: weeklySlotId || null,
      weeklySlotLabel: selectedSlot
        ? formatWeeklySlotLabel(
            selectedSlot.day_of_week,
            selectedSlot.start_time,
            selectedSlot.end_time,
            selectedSlot.gender_policy
          )
        : null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/cart");
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
                ? "מתאמן/ת אחד/ת"
                : `${enrollments.length} מתאמנים`
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
                      {e.children?.full_name ??
                        (e.child_id == null ? parent.fullName : "מתאמן/ת")}
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
                    {w.children?.full_name ??
                      (w.child_id == null ? parent.fullName : "מתאמן/ת")}
                  </span>
                  <Badge tone={WAITLIST_STATUS[w.status].tone}>
                    {WAITLIST_STATUS[w.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!ended && (availableTrainees.length > 0 || ineligibleTrainees.length > 0) ? (
          <div className="space-y-3">
            {!interestOnly && pickOneSlot && slots.length > 0 && (
              <SlotPickerTrigger
                slotsCount={slots.length}
                selectedSlot={selectedSlot}
                traineeGender={traineeGender}
                onOpen={() => setSlotPickerOpen(true)}
              />
            )}

            {enrollments.length > 0 && availableTrainees.length > 0 && (
              <p className="text-sm text-ink-600">
                ניתן להירשם גם עבור מתאמן או מתאמנת נוספים:
              </p>
            )}

            {gradeRestricted && gradeRangeLabel && (
              <p className="rounded-2xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
                החוג מיועד ל{gradeRangeLabel}.
              </p>
            )}
            {ageRestricted && (
              <p className="rounded-2xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
                החוג מיועד ל{formatAgeRange(ageMin, ageMax)}.
              </p>
            )}

            {!slotSoldOut && maxSelectable < availableTrainees.length && maxSelectable <= 0 && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                החוג מלא. אפשר להצטרף לרשימת המתנה.
              </p>
            )}

            <ChildPickerTrigger
              selectedTrainees={selectedTrainees}
              availableCount={availableTrainees.length}
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
                : needsSlot && !interestOnly
                  ? "נא לבחור מועד"
                  : slotSoldOut
                    ? `הצטרפות לרשימת המתנה (${selectedIds.length})`
                    : interestOnly
                      ? selectedIds.length > 1
                        ? `הרשמה לחוג (${selectedIds.length} מתאמנים)`
                        : "הרשמה לחוג"
                      : selectedIds.length > 1
                        ? `הוספה לסל (${selectedIds.length} מתאמנים)`
                        : "הוספה לסל"}
            </Button>
          </div>
        ) : (
          enrollments.length === 0 &&
          waitlist.length === 0 && (
            <p className="text-sm text-ink-500">
              {ended
                ? "לא ניתן להירשם לחוג שהסתיים."
                : ineligibleTrainees.length > 0
                  ? "אין מתאמן או מתאמנת שמתאימים לחוג זה."
                  : "כל המתאמנים בחשבון כבר רשומים לחוג זה."}
            </p>
          )
        )}
      </div>

      {interestOnly && (
        <Modal
          open={interestConfirmOpen}
          onClose={() => {
            if (!loading) setInterestConfirmOpen(false);
          }}
          title="הרשמה לחוג"
          description={classTitle}
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink-600">
              כרגע זו רק הרשמה, בלי תשלום ובלי מועד קבוע. כשהחוג ייפתח באמת
              נעדכן אתכם לגבי התשלום.
            </p>
            <div className="rounded-2xl bg-ink-50 px-4 py-3">
              <p className="text-xs font-semibold text-ink-500">נרשמים עכשיו</p>
              <ul className="mt-1.5 space-y-1 text-sm font-medium text-ink-900">
                {selectedTrainees.map((trainee) => (
                  <li key={trainee.id}>{trainee.full_name}</li>
                ))}
              </ul>
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setInterestConfirmOpen(false)}
              >
                חזרה
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void handleInterestRegister()}
              >
                {loading ? "שומר..." : "הרשמה"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {!interestOnly && pickOneSlot && slots.length > 0 && (
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
                    {full && (
                    <span className="mt-1 block text-xs text-ink-500">
                        המועד מלא — אפשר להצטרף לרשימת המתנה
                    </span>
                    )}
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
        title="בחירת מתאמן או מתאמנת"
        description={
          availableTrainees.length === 0
            ? "אין מתאמנים מתאימים להרשמה לחוג זה."
            : [
                gradeRestricted && gradeRangeLabel
                  ? `החוג מיועד ל${gradeRangeLabel}.`
                  : null,
                effectiveGender === "male"
                  ? parentEligible
                    ? "החוג לבנים בלבד. סמנו מי נרשם — אפשר לבחור גם את ההורה."
                    : "החוג לבנים בלבד. סמנו מי נרשם."
                  : effectiveGender === "female"
                    ? parentEligible
                      ? "החוג לבנות בלבד. סמנו מי נרשמת — אפשר לבחור גם את ההורה."
                      : "החוג לבנות בלבד. סמנו מי נרשמת."
                    : "סמנו מי נרשם לחוג — אפשר לבחור גם את ההורה.",
              ]
                .filter(Boolean)
                .join(" ")
        }
      >
        <div className="space-y-3">
          {availableTrainees.length > 1 && maxSelectable > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                {selectedIds.length === maxSelectable && maxSelectable > 0
                  ? "ביטול הכל"
                  : "בחירת כולם"}
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {availableTrainees.map((child) => {
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
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {child.kind === "parent"
                          ? eligibility?.ageLabel
                            ? `הורה · גיל ${eligibility.ageLabel}`
                            : "הורה"
                          : eligibility?.ageLabel
                            ? `גיל ${eligibility.ageLabel}`
                            : null}
                      </span>
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
            {ineligibleTrainees.map((child) => {
              const eligibility = eligibilityByChildId.get(child.id);
              return (
                <li key={child.id}>
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3.5 opacity-75">
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-ink-700">
                        {child.full_name}
                        {child.kind === "parent" && (
                          <span className="mr-1.5 text-xs font-normal text-ink-400">
                            הורה
                          </span>
                        )}
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
              {selectedSlot.available <= 0 ? " · המועד מלא" : ""}
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
  selectedTrainees,
  availableCount,
  eligibilityByChildId,
  onOpen,
}: {
  selectedTrainees: Trainee[];
  availableCount: number;
  eligibilityByChildId: Map<string, AgeEligibility>;
  onOpen: () => void;
}) {
  const selected = selectedTrainees.length > 0;
  const first = selectedTrainees[0];
  const firstAge = first
    ? eligibilityByChildId.get(first.id)?.ageLabel
    : null;
  const title = !selected
    ? "בחרו מתאמן או מתאמנת"
    : selectedTrainees.length === 1
      ? first.full_name
      : selectedTrainees.map((trainee) => trainee.full_name).join(", ");

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
        <Icon name={selected ? "check" : "user"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        {selected ? (
          <>
            <span className="block text-xs font-medium text-brand-700">
              {selectedTrainees.length === 1
                ? "המתאמן/ת שנבחר/ה"
                : "המתאמנים שנבחרו"}
            </span>
            <span className="mt-0.5 block truncate text-sm font-bold text-ink-900">
              {title}
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {selectedTrainees.length === 1
                ? first.kind === "parent"
                  ? firstAge != null
                    ? `הורה · גיל ${firstAge}`
                    : "הורה"
                  : firstAge != null
                    ? `גיל ${firstAge}`
                    : "נרשם לחוג"
                : `${selectedTrainees.length} מתאמנים נבחרו`}
            </span>
          </>
        ) : (
          <>
            <span className="block text-sm font-bold text-ink-900">
              בחרו מתאמן או מתאמנת
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              {availableCount === 0
                ? "אין מתאמנים מתאימים לחוג זה"
                : "אפשר לבחור את ההורה או ילד/ה מהחשבון"}
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
  interestOnly = false,
}: {
  classId: string;
  soldOut: boolean;
  ended?: boolean;
  interestOnly?: boolean;
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
          : interestOnly
            ? "יש להתחבר או לפתוח חשבון כדי להירשם — בלי תשלום"
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
