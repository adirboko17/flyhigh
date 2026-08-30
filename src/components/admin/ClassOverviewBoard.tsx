"use client";

import { useMemo, useState } from "react";
import type {
  ClassOverviewClassOption,
  ClassOverviewInstructorOption,
  ClassOverviewRow,
  ClassOverviewSlotOption,
} from "@/lib/admin/classOverview";
import { CancelEnrollmentButton } from "@/components/admin/CancelEnrollmentButton";
import { Icon } from "@/components/icons/Icon";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
} from "@/lib/constants";

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
}

function matchesRow(row: ClassOverviewRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const phoneQuery = phoneDigits(query);
  const phone = phoneDigits(row.parentLine ?? "");
  return (
    normalizeSearch(row.participantName).includes(q) ||
    normalizeSearch(row.classTitle).includes(q) ||
    normalizeSearch(row.slotLabel).includes(q) ||
    normalizeSearch(row.instructorLabel).includes(q) ||
    normalizeSearch(row.parentLine ?? "").includes(q) ||
    (phoneQuery.length >= 3 && phone.includes(phoneQuery))
  );
}

const controlClass =
  "h-11 min-w-0 px-3 text-base sm:h-10 sm:px-2.5 sm:text-sm";

function StatusBadges({ row }: { row: ClassOverviewRow }) {
  const status = ENROLLMENT_STATUS[row.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[row.paymentStatus];
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={status.tone}>{status.label}</Badge>
      <Badge tone={payment.tone}>{payment.label}</Badge>
    </div>
  );
}

function RemoveButton({
  row,
  compact,
}: {
  row: ClassOverviewRow;
  compact?: boolean;
}) {
  return (
    <CancelEnrollmentButton
      enrollmentId={row.id}
      title={row.classTitle}
      participantName={row.participantName}
      compact={compact}
    />
  );
}

export function ClassOverviewBoard({
  rows,
  classes,
  slots,
  instructors,
}: {
  rows: ClassOverviewRow[];
  classes: ClassOverviewClassOption[];
  slots: ClassOverviewSlotOption[];
  instructors: ClassOverviewInstructorOption[];
}) {
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [instructorId, setInstructorId] = useState("");

  const classSlots = useMemo(
    () => (classId ? slots.filter((slot) => slot.classId === classId) : []),
    [classId, slots]
  );

  const filtered = useMemo(() => {
    const selectedSlot = slotId
      ? slots.find((slot) => slot.id === slotId)
      : null;

    return rows.filter((row) => {
      if (classId && row.classId !== classId) return false;
      if (instructorId && !row.instructorIds.includes(instructorId)) {
        return false;
      }
      if (selectedSlot) {
        const matchesSlot =
          row.slotId === selectedSlot.id ||
          (row.attendsAllSlots && row.classId === selectedSlot.classId);
        if (!matchesSlot) return false;
      }
      return matchesRow(row, query);
    });
  }, [rows, slots, query, classId, slotId, instructorId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { title: string; rows: ClassOverviewRow[] }>();
    for (const row of filtered) {
      const existing = map.get(row.classId);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(row.classId, { title: row.classTitle, rows: [row] });
      }
    }
    return [...map.values()];
  }, [filtered]);

  const classCount = grouped.length;
  const filtering =
    query.trim().length > 0 || Boolean(classId || slotId || instructorId);

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    if (
      slotId &&
      !slots.some((slot) => slot.id === slotId && slot.classId === nextClassId)
    ) {
      setSlotId("");
    }
  }

  function clearFilters() {
    setQuery("");
    setClassId("");
    setSlotId("");
    setInstructorId("");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-start sm:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <CardTitle>נרשמים לחוגים</CardTitle>
          <Badge tone="neutral">
            {filtered.length} נרשמים
            {classCount > 0 ? ` · ${classCount} חוגים` : ""}
          </Badge>
        </div>
        <span className="text-sm text-ink-400">
          {filtering
            ? `${filtered.length} מתוך ${rows.length}`
            : `${rows.length} בסך הכל`}
        </span>
      </CardHeader>

      {rows.length > 0 && (
        <div className="space-y-3 border-b border-ink-100 px-4 py-3 sm:px-5">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם מתאמן, חוג, מדריך או טלפון"
            className="h-11 border-ink-100 bg-ink-50/50 text-base focus:bg-white sm:h-10 sm:text-sm"
            aria-label="חיפוש נרשמים לחוגים"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              value={classId}
              onChange={(event) => handleClassChange(event.target.value)}
              className={controlClass}
              aria-label="סינון לפי חוג"
            >
              <option value="">כל החוגים</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.title}
                </option>
              ))}
            </Select>
            <Select
              value={slotId}
              onChange={(event) => setSlotId(event.target.value)}
              className={controlClass}
              aria-label="סינון לפי מועד"
              disabled={!classId || classSlots.length < 2}
            >
              <option value="">
                {!classId
                  ? "בחרו חוג כדי לסנן מועד"
                  : classSlots.length < 2
                    ? "מועד אחד בחוג"
                    : "כל המועדים"}
              </option>
              {classSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </Select>
            <Select
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
              className={`${controlClass} sm:col-span-2 lg:col-span-1`}
              aria-label="סינון לפי מדריך"
            >
              <option value="">כל המדריכים</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.fullName}
                </option>
              ))}
            </Select>
          </div>
          {filtering && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-10 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              ניקוי סינון
            </button>
          )}
        </div>
      )}

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            title="אין נרשמים לחוגים"
            description="כשלקוחות יירשמו לחוג, הם יופיעו כאן."
            icon="🏊"
            className="border-0 bg-transparent"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="לא נמצאו נרשמים"
            description="נסו שם אחר, או שנו את הסינון לפי חוג, מועד או מדריך."
            icon="🔎"
            className="border-0 bg-transparent"
          />
        ) : (
          <>
            <div className="lg:hidden">
              {grouped.map((group) => (
                <section key={group.rows[0]?.classId ?? group.title}>
                  <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/80 px-4 py-2.5">
                    <p className="min-w-0 font-display text-sm font-bold text-ink-900">
                      {group.title}
                    </p>
                    <Badge tone="neutral">{group.rows.length}</Badge>
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {group.rows.map((row) => (
                      <li key={row.id} className="px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900">
                              {row.participantName}
                            </p>
                            {row.parentLine && (
                              <p className="mt-0.5 break-words text-xs text-ink-500">
                                {row.parentLine}
                              </p>
                            )}
                          </div>
                          <RemoveButton row={row} />
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-ink-600">
                          <p className="flex items-start gap-1.5">
                            <Icon
                              name="calendar"
                              size={14}
                              className="mt-0.5 shrink-0 opacity-70"
                            />
                            <span className="min-w-0 break-words">
                              {row.slotLabel}
                            </span>
                          </p>
                          <p className="flex items-start gap-1.5">
                            <Icon
                              name="user"
                              size={14}
                              className="mt-0.5 shrink-0 opacity-70"
                            />
                            <span className="min-w-0 break-words">
                              {row.instructorLabel}
                            </span>
                          </p>
                        </div>
                        <div className="mt-2.5">
                          <StatusBadges row={row} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="hidden lg:block">
              <Table>
                <THead>
                  <TR>
                    <TH>מתאמן/ת</TH>
                    <TH>חוג</TH>
                    <TH>מועד</TH>
                    <TH>מדריך/ה</TH>
                    <TH>סטטוס</TH>
                    <TH className="w-24"> </TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        <p className="font-semibold text-ink-900">
                          {row.participantName}
                        </p>
                        {row.parentLine && (
                          <p className="mt-0.5 text-xs text-ink-500">
                            {row.parentLine}
                          </p>
                        )}
                      </TD>
                      <TD className="font-medium text-ink-800">
                        {row.classTitle}
                      </TD>
                      <TD className="whitespace-nowrap text-ink-700">
                        {row.slotLabel}
                      </TD>
                      <TD className="text-ink-700">{row.instructorLabel}</TD>
                      <TD>
                        <StatusBadges row={row} />
                      </TD>
                      <TD className="text-end">
                        <RemoveButton row={row} compact />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
