"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IncomeClassSelect } from "@/components/admin/IncomeClassSelect";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import type { IncomeClassOption } from "@/lib/admin/incomeClasses";
import { assignEnrollmentIncomeClass } from "@/lib/admin/incomeClassActions";
import type { PlanBuyerKind, PlanBuyerRow } from "@/lib/admin/loadPlanBuyers";
import { ENROLLMENT_PAYMENT_STATUS, ENROLLMENT_STATUS } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

const TABS: { id: PlanBuyerKind; label: string }[] = [
  { id: "pool_pass", label: "כרטיסיות" },
  { id: "membership", label: "מנויים" },
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function PlanBuyersList({
  rows,
  classes,
}: {
  rows: PlanBuyerRow[];
  classes: IncomeClassOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PlanBuyerKind>("pool_pass");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const classById = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );

  const counts = useMemo(() => {
    return {
      pool_pass: rows.filter((row) => row.kind === "pool_pass").length,
      membership: rows.filter((row) => row.kind === "membership").length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = normalize(query);
    return rows.filter((row) => {
      if (row.kind !== tab) return false;
      if (!q) return true;
      return (
        normalize(row.parentName).includes(q) ||
        normalize(row.phone).includes(q) ||
        normalize(row.participant).includes(q) ||
        normalize(row.title).includes(q)
      );
    });
  }, [rows, tab, query]);

  const assignedCount = visible.filter((row) => row.incomeClassId && !row.incomeClassMixed).length;

  function assign(row: PlanBuyerRow, classId: string | null) {
    setError(null);
    setBusyId(row.id);
    startTransition(async () => {
      const result = await assignEnrollmentIncomeClass({
        enrollmentId: row.id,
        classId,
      });
      setBusyId(null);
      if (!result.success) {
        setError(result.error ?? "שמירת השיוך לחוג נכשלה.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full bg-ink-50 p-1">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-ink-600 hover:text-ink-900"
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold",
                    active ? "bg-white/20 text-white" : "bg-white text-ink-500"
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש לפי שם, טלפון או שם המוצר..."
          aria-label="חיפוש רוכשות"
          className="sm:max-w-xs"
        />
      </div>

      {visible.length > 0 && (
        <p className="px-1 text-sm text-ink-500">
          {assignedCount} משויכות לחוג
          <span className="mx-1.5 text-ink-300">·</span>
          {visible.length - assignedCount} עדיין על בריכה
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={query ? "לא נמצאו תוצאות" : tab === "pool_pass" ? "אין רכישות כרטיסייה" : "אין רכישות מנוי"}
          description={query ? "נסו שם אחר." : "רכישות חדשות יופיעו כאן."}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => {
            const payment = ENROLLMENT_PAYMENT_STATUS[row.paymentStatus];
            const enrollment =
              row.enrollmentStatus === "active" ? null : ENROLLMENT_STATUS[row.enrollmentStatus];
            const busy = isPending && busyId === row.id;
            const assigned = row.incomeClassId ? classById.get(row.incomeClassId) : undefined;
            const linked = Boolean(assigned) && !row.incomeClassMixed;

            return (
              <li key={row.id}>
                <article
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white shadow-card",
                    linked ? "border-aqua-100" : "border-ink-100",
                    row.enrollmentStatus === "cancelled" && "opacity-70"
                  )}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <Avatar name={row.parentName} className="mt-0.5 h-11 w-11 text-base" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/customers?id=${row.parentId}`}
                            className="font-display text-lg font-bold text-ink-900 transition-colors hover:text-brand-700"
                          >
                            {row.parentName}
                          </Link>
                          <Badge tone={payment.tone}>{payment.label}</Badge>
                          {enrollment && <Badge tone={enrollment.tone}>{enrollment.label}</Badge>}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-500">{row.participant}</p>
                        {row.phone && (
                          <a
                            href={`tel:${row.phone}`}
                            dir="ltr"
                            className="mt-0.5 inline-block text-sm text-ink-500 transition-colors hover:text-brand-700"
                          >
                            {row.phone}
                          </a>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-sm font-semibold text-brand-800">
                            {row.title}
                          </span>
                          {row.detail && (
                            <span className="text-xs font-medium text-ink-500">{row.detail}</span>
                          )}
                          <span className="text-xs text-ink-400">{formatDate(row.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "w-full shrink-0 rounded-2xl border p-3 sm:w-72",
                        linked
                          ? "border-aqua-200 bg-aqua-50/70"
                          : "border-ink-100 bg-ink-50/80"
                      )}
                    >
                      {row.canAssign ? (
                        <>
                          <IncomeClassSelect
                            value={row.incomeClassId}
                            classes={classes}
                            disabled={busy}
                            flush
                            onChange={(classId) => assign(row, classId)}
                          />
                          {row.incomeClassMixed ? (
                            <p className="mt-2 text-xs leading-relaxed text-amber-700">
                              לחיובים של הרכישה הזו יש שיוך שונה. בחירה כאן תאחד את כולם.
                            </p>
                          ) : linked && assigned ? (
                            <p className="mt-2 text-xs font-medium text-aqua-800">
                              הכסף נספר על {assigned.category || assigned.title}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-ink-400">
                              בלי בחירה, ההכנסה נשארת על בריכה.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="py-2 text-center text-sm text-ink-400">
                          אין חיוב מקושר לרכישה הזו.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
