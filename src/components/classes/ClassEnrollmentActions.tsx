"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";
import {
  parentEnrollmentDisplayBadge,
  WAITLIST_STATUS,
} from "@/lib/constants";
import { joinClassWaitlist } from "@/lib/enrollment/actions";
import {
  formatAgeRange,
  getAgeEligibility,
  hasAgeRestriction,
} from "@/lib/enrollment/ageValidation";
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";
import { ClassEnrollmentCheckoutDialog } from "./ClassEnrollmentCheckoutDialog";
import type { ProratedClassPrice } from "@/lib/finance/proratedClassPrice";
import type { Enums } from "@/types/database.types";

type Child = { id: string; full_name: string; birth_date: string | null };

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
  ageMin: number | null;
  ageMax: number | null;
  soldOut: boolean;
  ended?: boolean;
  availableSpots: number;
  kids: Child[];
  enrollments: ExistingEnrollment[];
  waitlist: WaitlistEntry[];
  siblingTiers: SiblingDiscountTier[];
}

export function ClassEnrollmentActions({
  classId,
  classTitle,
  classPrice,
  proration,
  ageMin,
  ageMax,
  soldOut,
  ended = false,
  availableSpots,
  kids,
  enrollments,
  waitlist,
  siblingTiers,
}: ClassEnrollmentActionsProps) {
  const router = useRouter();
  const ageRestricted = hasAgeRestriction(ageMin, ageMax);
  const eligibilityByChildId = useMemo(
    () =>
      new Map(
        kids.map((child) => [
          child.id,
          getAgeEligibility(child.birth_date, ageMin, ageMax, child.full_name),
        ])
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

  const maxSelectable = useMemo(
    () =>
      soldOut
        ? availableChildren.length
        : Math.min(availableChildren.length, Math.max(0, availableSpots)),
    [availableChildren.length, availableSpots, soldOut]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [enrollmentsExpanded, setEnrollmentsExpanded] = useState(false);
  const [childrenExpanded, setChildrenExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(availableChildren.slice(0, maxSelectable).map((c) => c.id));
    setError(null);
  }, [availableChildren, maxSelectable]);

  const selectedChildren = availableChildren.filter((c) =>
    selectedIds.includes(c.id)
  );

  const atSelectionLimit = !soldOut && selectedIds.length >= maxSelectable;

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
      if (!soldOut && prev.length >= maxSelectable) {
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
    if (selectedIds.length === 0) {
      setError("נא לבחור לפחות ילד/ה אחד/ת.");
      return;
    }

    setError(null);
    setLoading(true);

    const result = await joinClassWaitlist({
      classId,
      childIds: selectedIds,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "לא הצלחנו לשמור את רשימת המתנה.");
      return;
    }

    router.refresh();
  }

  function handleContinue() {
    if (selectedIds.length === 0) {
      setError("נא לבחור לפחות ילד/ה אחד/ת.");
      return;
    }
    if (!soldOut && selectedIds.length > maxSelectable) {
      setError(
        maxSelectable <= 0
          ? "אין מקומות פנויים בחוג."
          : `נותרו רק ${maxSelectable} מקומות פנויים בחוג.`
      );
      return;
    }
    setError(null);
    if (soldOut) {
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

            {!soldOut && maxSelectable < availableChildren.length && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                {maxSelectable <= 0
                  ? "אין מקומות פנויים בחוג."
                  : `נותרו ${maxSelectable} מקומות פנויים — ניתן לבחור עד ${maxSelectable} ${maxSelectable === 1 ? "ילד/ה" : "ילדים"}.`}
              </p>
            )}

            <CollapsibleSummaryCard
              id="class-children-list"
              tone="brand"
              count={availableChildren.length + ineligibleChildren.length}
              title="בחירת ילדים"
              subtitle={
                availableChildren.length === 0
                  ? "אין ילדים מתאימים לטווח הגילאים"
                  : maxSelectable < availableChildren.length
                    ? `${selectedIds.length} מתוך ${maxSelectable} נבחרו`
                    : `${selectedIds.length} מתוך ${availableChildren.length} נבחרו`
              }
              expanded={childrenExpanded}
              onToggle={() => setChildrenExpanded((open) => !open)}
            >
              {availableChildren.length > 1 && maxSelectable > 0 && (
                <div className="flex justify-end border-b border-brand-100 px-3.5 py-2 sm:px-4">
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
              <ul className="space-y-2 px-3.5 pb-3 pt-2 sm:px-4">
                {availableChildren.map((child) => {
                  const checked = selectedIds.includes(child.id);
                  const disabled = atSelectionLimit && !checked;
                  const eligibility = eligibilityByChildId.get(child.id);
                  return (
                    <li key={child.id}>
                      <label
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                          disabled
                            ? "cursor-not-allowed border-ink-100 bg-ink-50 opacity-60"
                            : checked
                              ? "cursor-pointer border-brand-300 bg-brand-50"
                              : "cursor-pointer border-ink-100 bg-white hover:border-ink-200"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleChild(child.id)}
                          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400 disabled:cursor-not-allowed"
                        />
                        <span className="min-w-0 flex-1 font-medium text-ink-900">
                          {child.full_name}
                          {eligibility?.age !== null && eligibility?.age !== undefined && (
                            <span className="mr-1.5 text-xs font-normal text-ink-400">
                              גיל {eligibility.age}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
                {ineligibleChildren.map((child) => {
                  const eligibility = eligibilityByChildId.get(child.id);
                  return (
                    <li key={child.id}>
                      <div
                        className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 opacity-75"
                        title={eligibility?.reason ?? undefined}
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="mt-0.5 h-4 w-4 cursor-not-allowed rounded border-ink-300"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-ink-700">
                            {child.full_name}
                            {eligibility?.age !== null && eligibility?.age !== undefined && (
                              <span className="mr-1.5 text-xs font-normal text-ink-400">
                                גיל {eligibility.age}
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
            </CollapsibleSummaryCard>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={loading || selectedIds.length === 0}
              onClick={handleContinue}
            >
              {loading
                ? "שומר..."
                : soldOut
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

      {!soldOut && !ended && (
        <ClassEnrollmentCheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          classId={classId}
          classTitle={classTitle}
          unitPrice={classPrice}
          proration={proration}
          selectedChildren={selectedChildren}
          siblingTiers={siblingTiers}
          enrolledSiblings={enrollments.length}
        />
      )}
    </>
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
