"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import { ATTENDANCE_STATUS } from "@/lib/constants";
import {
  loadCustomerAttendance,
  type CustomerAttendanceRecord,
} from "@/lib/admin/customerAttendance";
import { cn } from "@/utils/cn";
import type { Enums } from "@/types";

type Status = Enums<"attendance_status">;

const STATUS_ORDER: Status[] = [
  "present",
  "late",
  "absent",
  "advance_notice",
];

function currentCalendarYear() {
  return new Date().getFullYear();
}

function formatAttendanceDate(date: string) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function countByStatus(rows: CustomerAttendanceRecord[]) {
  const counts: Record<Status, number> = {
    present: 0,
    late: 0,
    absent: 0,
    advance_notice: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

type ClassGroup = {
  classId: string;
  classTitle: string;
  records: CustomerAttendanceRecord[];
  people: { personKey: string; personName: string; records: CustomerAttendanceRecord[] }[];
};

export function CustomerAttendance({ parentId }: { parentId: string }) {
  const [rows, setRows] = useState<CustomerAttendanceRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(currentCalendarYear);
  const [personKey, setPersonKey] = useState<string>("all");
  const [openClassIds, setOpenClassIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    setPersonKey("all");
    setOpenClassIds(new Set());
    loadCustomerAttendance(parentId)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        if (data[0]) setYear(data[0].year);
      })
      .catch(() => {
        if (cancelled) return;
        setError("לא הצלחנו לטעון את הנוכחות.");
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  const years = useMemo(() => {
    const set = new Set<number>([currentCalendarYear()]);
    for (const row of rows ?? []) set.add(row.year);
    return [...set].sort((a, b) => b - a);
  }, [rows]);

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows ?? []) {
      if (!map.has(row.personKey)) map.set(row.personKey, row.personName);
    }
    return [...map.entries()].map(([key, name]) => ({ key, name }));
  }, [rows]);

  const visible = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          row.year === year &&
          (personKey === "all" || row.personKey === personKey)
      ),
    [rows, year, personKey]
  );

  useEffect(() => {
    if (!rows) return;
    const first = rows.find(
      (row) =>
        row.year === year &&
        (personKey === "all" || row.personKey === personKey)
    )?.classId;
    if (first) setOpenClassIds(new Set([first]));
  }, [rows, year, personKey]);

  const groups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, ClassGroup>();
    for (const row of visible) {
      const group = map.get(row.classId) ?? {
        classId: row.classId,
        classTitle: row.classTitle,
        records: [],
        people: [],
      };
      group.records.push(row);
      map.set(row.classId, group);
    }

    return [...map.values()].map((group) => {
      const peopleMap = new Map<
        string,
        ClassGroup["people"][number]
      >();
      for (const row of group.records) {
        const person = peopleMap.get(row.personKey) ?? {
          personKey: row.personKey,
          personName: row.personName,
          records: [],
        };
        person.records.push(row);
        peopleMap.set(row.personKey, person);
      }
      return { ...group, people: [...peopleMap.values()] };
    });
  }, [visible]);

  const totals = useMemo(() => countByStatus(visible), [visible]);

  function toggleClass(classId: string) {
    setOpenClassIds((current) => {
      const next = new Set(current);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">נוכחות</h3>
        {rows && visible.length > 0 && (
          <Badge tone="brand">{visible.length} מפגשים</Badge>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-500">
        היסטוריית נוכחות לפי חוג, שיעור פרטי, פעילות או כרטיסייה — של הלקוח ושל הילדים
      </p>

      {years.length > 1 && (
        <FilterChips
          items={years.map((item) => ({
            key: String(item),
            label: String(item),
          }))}
          value={String(year)}
          onChange={(value) => setYear(Number(value))}
        />
      )}

      {people.length > 1 && (
        <FilterChips
          items={[
            { key: "all", label: "כולם" },
            ...people.map((person) => ({
              key: person.key,
              label: person.name,
            })),
          ]}
          value={personKey}
          onChange={setPersonKey}
        />
      )}

      {rows !== null && visible.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((status) =>
            totals[status] > 0 ? (
              <Badge
                key={status}
                tone={ATTENDANCE_STATUS[status].tone}
                className="px-2 py-0 text-[11px]"
              >
                {totals[status]} {ATTENDANCE_STATUS[status].label}
              </Badge>
            ) : null
          )}
        </div>
      )}

      {rows === null ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-400">
            טוען נוכחות...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-500">
            {error}
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-500">
            {rows.length === 0
              ? "אין רישומי נוכחות ללקוח זה"
              : `אין נוכחות בשנת ${year}`}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <ClassAttendanceCard
              key={group.classId}
              group={group}
              open={openClassIds.has(group.classId)}
              onToggle={() => toggleClass(group.classId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChips({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={
            item.key === value
              ? "rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white"
              : "rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-200"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ClassAttendanceCard({
  group,
  open,
  onToggle,
}: {
  group: ClassGroup;
  open: boolean;
  onToggle: () => void;
}) {
  const counts = countByStatus(group.records);
  const panelId = `customer-attendance-${group.classId}`;

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-right hover:bg-ink-50/80"
      >
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{group.classTitle}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {group.people.length === 1
              ? `${group.people[0].personName} · ${group.records.length} מפגשים`
              : `${group.people.length} משתתפים · ${group.records.length} מפגשים`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {STATUS_ORDER.map((status) =>
              counts[status] > 0 ? (
                <Badge
                  key={status}
                  tone={ATTENDANCE_STATUS[status].tone}
                  className="px-1.5 py-0 text-[10px]"
                >
                  {counts[status]} {ATTENDANCE_STATUS[status].label}
                </Badge>
              ) : null
            )}
          </div>
        </div>
        <Icon
          name="chevron"
          size={18}
          className={cn(
            "mt-1 shrink-0 text-ink-400 transition-transform",
            open ? "-rotate-90" : "rotate-90"
          )}
        />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-ink-100"
      >
        {group.people.length > 1
          ? group.people.map((person) => (
              <div
                key={person.personKey}
                className="border-b border-ink-50 last:border-0"
              >
                <p className="bg-ink-50/70 px-4 py-2 text-xs font-semibold text-ink-600">
                  {person.personName}
                </p>
                <AttendanceDateList records={person.records} />
              </div>
            ))
          : (
              <AttendanceDateList records={group.records} />
            )}
      </div>
    </Card>
  );
}

function AttendanceDateList({
  records,
}: {
  records: CustomerAttendanceRecord[];
}) {
  return (
    <ul className="divide-y divide-ink-50">
      {records.map((row) => (
        <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-800">
              {formatAttendanceDate(row.date)}
              {row.sessionTime ? (
                <span className="ms-1.5 text-xs font-normal text-ink-400">
                  {row.sessionTime}
                </span>
              ) : null}
            </p>
            {row.notes && (
              <p className="mt-0.5 text-xs text-ink-500">{row.notes}</p>
            )}
          </div>
          <Badge
            tone={ATTENDANCE_STATUS[row.status].tone}
            className="shrink-0 px-1.5 py-0 text-[10px]"
          >
            {ATTENDANCE_STATUS[row.status].label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
