"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
} from "@/lib/constants";
import { cn } from "@/utils/cn";

type EnrollmentType = keyof typeof ENROLLMENT_TYPE;

export type ActivityEntry = {
  id: string;
  type: EnrollmentType;
  status: keyof typeof ENROLLMENT_STATUS;
  payment_status: keyof typeof ENROLLMENT_PAYMENT_STATUS;
  adminAssigned: boolean;
  created_at: string;
  title: string;
  parentName: string | null;
  parentPhone: string | null;
  childName: string | null;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
};

interface ActivityFeedProps {
  entries: ActivityEntry[];
  todayKey: string;
}

const TYPE_STYLE: Record<
  EnrollmentType,
  { icon: string; dot: string; chip: string }
> = {
  class: {
    icon: "🏊",
    dot: "bg-brand-100 text-brand-700",
    chip: "bg-brand-100 text-brand-700",
  },
  program: {
    icon: "🎫",
    dot: "bg-aqua-100 text-aqua-700",
    chip: "bg-aqua-100 text-aqua-700",
  },
  pool_pass: {
    icon: "🪪",
    dot: "bg-sky-100 text-sky-700",
    chip: "bg-sky-100 text-sky-700",
  },
};

type Filter = "all" | EnrollmentType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "class", label: "חוגים" },
  { id: "program", label: "מסלולים" },
  { id: "pool_pass", label: "כניסות" },
];

export function ActivityFeed({ entries, todayKey }: ActivityFeedProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const byType: Record<Filter, number> = {
      all: entries.length,
      class: 0,
      program: 0,
      pool_pass: 0,
    };
    for (const entry of entries) byType[entry.type] += 1;
    return byType;
  }, [entries]);

  const todayCount = useMemo(
    () => entries.filter((e) => e.dayKey === todayKey).length,
    [entries, todayKey]
  );

  const unpaidCount = useMemo(
    () => entries.filter((e) => e.payment_status === "unpaid").length,
    [entries]
  );

  const groups = useMemo(() => {
    const visible =
      filter === "all" ? entries : entries.filter((e) => e.type === filter);

    const map = new Map<string, { label: string; items: ActivityEntry[] }>();
    for (const entry of visible) {
      const group = map.get(entry.dayKey);
      if (group) group.items.push(entry);
      else map.set(entry.dayKey, { label: entry.dayLabel, items: [entry] });
    }
    return [...map.values()];
  }, [entries, filter]);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="אין פעילות עדיין"
        description="הרשמות חדשות יופיעו כאן ברגע שיתקבלו."
        icon="📝"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="סך הרשמות" value={entries.length} icon="📝" tone="brand" />
        <StatCard label="נרשמו היום" value={todayCount} icon="✨" tone="aqua" />
        <StatCard
          label="ממתין לתשלום"
          value={unpaidCount}
          icon="💳"
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                active
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "border border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-bold",
                  active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
                )}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="אין פעילות בקטגוריה הזו"
          description="בחרו מסנן אחר כדי לראות פעילות נוספת."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-sm font-bold text-ink-700">
                  {group.label}
                </h2>
                <span className="text-xs text-ink-400">
                  {group.items.length} הרשמות
                </span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>

              <ol className="relative space-y-3 pe-5">
                {/* קו הציר של הטיימליין */}
                <span
                  aria-hidden
                  className="absolute inset-y-2 end-[15px] w-px bg-ink-100"
                />
                {group.items.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const style = TYPE_STYLE[entry.type];
  const status = ENROLLMENT_STATUS[entry.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[entry.payment_status];

  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          "absolute end-[-20px] top-4 flex h-8 w-8 items-center justify-center rounded-full text-sm ring-4 ring-ink-50",
          style.dot
        )}
      >
        {style.icon}
      </span>

      <Card className="overflow-hidden transition-shadow hover:shadow-glow">
        <CardContent className="flex flex-wrap items-start gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink-900">{entry.title}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  style.chip
                )}
              >
                {ENROLLMENT_TYPE[entry.type]}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-500">
              {entry.parentName && (
                <span className="flex items-center gap-1.5">
                  <Avatar name={entry.parentName} className="h-6 w-6 text-[10px]" />
                  {entry.parentName}
                </span>
              )}
              {entry.childName && <span>עבור {entry.childName}</span>}
              {entry.parentPhone && (
                <span dir="ltr" className="text-ink-400">
                  {entry.parentPhone}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-medium text-ink-400">
              {entry.timeLabel}
            </span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {entry.adminAssigned && <Badge tone="info">שיבוץ ידני</Badge>}
              <Badge tone={status.tone}>{status.label}</Badge>
              <Badge tone={payment.tone}>{payment.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
