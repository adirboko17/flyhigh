"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  loadCustomerAdvanceNotices,
  type CustomerAdvanceNotice,
} from "@/lib/admin/customerAdvanceNotices";
import { formatDate } from "@/utils/format";

function currentCalendarYear() {
  return new Date().getFullYear();
}

export function CustomerAdvanceNotices({ parentId }: { parentId: string }) {
  const [rows, setRows] = useState<CustomerAdvanceNotice[] | null>(null);
  const [year, setYear] = useState(currentCalendarYear);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    loadCustomerAdvanceNotices(parentId).then((data) => {
      if (!cancelled) setRows(data);
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

  const visible = useMemo(
    () => (rows ?? []).filter((row) => row.year === year),
    [rows, year]
  );

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { personName: string; classTitle: string; dates: CustomerAdvanceNotice[] }
    >();
    for (const row of visible) {
      const key = `${row.personName}::${row.classTitle}`;
      const group = map.get(key) ?? {
        personName: row.personName,
        classTitle: row.classTitle,
        dates: [],
      };
      group.dates.push(row);
      map.set(key, group);
    }
    return [...map.values()];
  }, [visible]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink-900">
          עדכונים מראש
        </h3>
        {rows && visible.length > 0 && (
          <Badge tone="info">{visible.length} מפגשים</Badge>
        )}
      </div>
      <p className="mb-3 text-sm text-ink-500">
        ביטול 24 שעות מראש ללא חיוב. בסוף השנה רואים כאן כמה מפגשים להחזיר.
      </p>

      {years.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {years.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setYear(item)}
              className={
                item === year
                  ? "rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-200"
              }
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {rows === null ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-400">
            טוען עדכונים...
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="bg-ink-50/60">
          <CardContent className="py-8 text-center text-sm text-ink-500">
            אין עדכונים מראש בשנת {year}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-ink-100">
            {groups.map((group) => (
              <li
                key={`${group.personName}-${group.classTitle}`}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">
                      {group.classTitle}
                    </p>
                    <p className="text-sm text-ink-500">{group.personName}</p>
                  </div>
                  <Badge tone="info" className="shrink-0">
                    {group.dates.length} להחזיר
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {group.dates.map((row) => formatDate(row.date)).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
