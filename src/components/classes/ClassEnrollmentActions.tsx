"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";
import {
  ENROLLMENT_STATUS,
  ENROLLMENT_PAYMENT_STATUS,
  WAITLIST_STATUS,
} from "@/lib/constants";
import { joinClassWaitlist } from "@/lib/enrollment/actions";
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";
import { ClassEnrollmentCheckoutDialog } from "./ClassEnrollmentCheckoutDialog";
import type { Enums } from "@/types/database.types";

type Child = { id: string; full_name: string };

type ExistingEnrollment = {
  id: string;
  child_id: string | null;
  status: Enums<"enrollment_status">;
  payment_status: Enums<"enrollment_payment_status">;
  children: { full_name: string } | null;
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
  soldOut: boolean;
  kids: Child[];
  enrollments: ExistingEnrollment[];
  waitlist: WaitlistEntry[];
  siblingTiers: SiblingDiscountTier[];
}

export function ClassEnrollmentActions({
  classId,
  classTitle,
  classPrice,
  soldOut,
  kids,
  enrollments,
  waitlist,
  siblingTiers,
}: ClassEnrollmentActionsProps) {
  const router = useRouter();
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
        (c) => !enrolledChildIds.has(c.id) && !waitlistedChildIds.has(c.id)
      ),
    [kids, enrolledChildIds, waitlistedChildIds]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(availableChildren.map((c) => c.id));
  }, [availableChildren]);

  const selectedChildren = availableChildren.filter((c) =>
    selectedIds.includes(c.id)
  );

  function toggleChild(childId: string) {
    setSelectedIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  }

  function toggleAll() {
    if (selectedIds.length === availableChildren.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(availableChildren.map((c) => c.id));
    }
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
    setError(null);
    if (soldOut) {
      void handleWaitlistJoin();
      return;
    }
    setCheckoutOpen(true);
  }

  if (kids.length === 0) {
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
          <div className="rounded-2xl border border-aqua-200 bg-aqua-50 p-4">
            <p className="text-sm font-semibold text-aqua-800">
              כבר רשומים לחוג זה
            </p>
            <ul className="mt-2 space-y-2">
              {enrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium text-ink-900">
                    {e.children?.full_name ?? "ילד/ה"}
                  </span>
                  <Badge tone={ENROLLMENT_STATUS[e.status].tone}>
                    {ENROLLMENT_STATUS[e.status].label}
                  </Badge>
                  <Badge tone={ENROLLMENT_PAYMENT_STATUS[e.payment_status].tone}>
                    {ENROLLMENT_PAYMENT_STATUS[e.payment_status].label}
                  </Badge>
                </li>
              ))}
            </ul>
            <ButtonLink
              href="/parent/dashboard#enrollments"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
            >
              לניהול ההרשמות
            </ButtonLink>
          </div>
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

        {availableChildren.length > 0 ? (
          <div className="space-y-3">
            {enrollments.length > 0 && (
              <p className="text-sm text-ink-600">
                ניתן להירשם גם עבור ילד/ה נוסף/ת:
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-700">
                  בחירת ילדים ({selectedIds.length}/{availableChildren.length})
                </p>
                {availableChildren.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    {selectedIds.length === availableChildren.length
                      ? "ביטול הכל"
                      : "בחירת כולם"}
                  </button>
                )}
              </div>

              <ul className="space-y-2">
                {availableChildren.map((child) => {
                  const checked = selectedIds.includes(child.id);
                  return (
                    <li key={child.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                          checked
                            ? "border-brand-300 bg-brand-50"
                            : "border-ink-100 bg-white hover:border-ink-200"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChild(child.id)}
                          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-400"
                        />
                        <span className="font-medium text-ink-900">
                          {child.full_name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

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
              כל הילדים כבר רשומים לחוג זה.
            </p>
          )
        )}
      </div>

      {!soldOut && (
        <ClassEnrollmentCheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          classId={classId}
          classTitle={classTitle}
          unitPrice={classPrice}
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
}: {
  classId: string;
  soldOut: boolean;
}) {
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
