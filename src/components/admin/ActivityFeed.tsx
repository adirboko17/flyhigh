"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Icon } from "@/components/icons/Icon";
import {
  ENROLLMENT_PAYMENT_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
} from "@/lib/constants";
import { cn } from "@/utils/cn";

type EnrollmentType = keyof typeof ENROLLMENT_TYPE;

export type ActivityEntry = {
  id: string;
  parentId: string;
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

type ActivityParentGroup = {
  id: string;
  parentId: string;
  parentName: string | null;
  parentPhone: string | null;
  dayKey: string;
  dayLabel: string;
  created_at: string;
  timeLabel: string;
  /** סוג ההרשמה העדכנית ביותר בקבוצה — לציור נקודת הטיימליין. */
  leadType: EnrollmentType;
  lines: ActivityEntry[];
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

function groupEntriesByParentDay(entries: ActivityEntry[]): ActivityParentGroup[] {
  const map = new Map<string, ActivityParentGroup>();

  for (const entry of entries) {
    const key = `${entry.dayKey}:${entry.parentId}`;
    const existing = map.get(key);

    if (existing) {
      existing.lines.push(entry);
      if (entry.created_at > existing.created_at) {
        existing.created_at = entry.created_at;
        existing.timeLabel = entry.timeLabel;
        existing.leadType = entry.type;
      }
      continue;
    }

    map.set(key, {
      id: key,
      parentId: entry.parentId,
      parentName: entry.parentName,
      parentPhone: entry.parentPhone,
      dayKey: entry.dayKey,
      dayLabel: entry.dayLabel,
      created_at: entry.created_at,
      timeLabel: entry.timeLabel,
      leadType: entry.type,
      lines: [entry],
    });
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      lines: [...group.lines].sort(
        (a, b) => b.created_at.localeCompare(a.created_at)
      ),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

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

  const daySections = useMemo(() => {
    const visible =
      filter === "all" ? entries : entries.filter((e) => e.type === filter);

    const parentGroups = groupEntriesByParentDay(visible);

    const map = new Map<
      string,
      { label: string; groups: ActivityParentGroup[]; enrollmentCount: number }
    >();

    for (const group of parentGroups) {
      const section = map.get(group.dayKey);
      if (section) {
        section.groups.push(group);
        section.enrollmentCount += group.lines.length;
      } else {
        map.set(group.dayKey, {
          label: group.dayLabel,
          groups: [group],
          enrollmentCount: group.lines.length,
        });
      }
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

      {daySections.length === 0 ? (
        <EmptyState
          title="אין פעילות בקטגוריה הזו"
          description="בחרו מסנן אחר כדי לראות פעילות נוספת."
        />
      ) : (
        <div className="space-y-6">
          {daySections.map((section) => (
            <section key={section.label} className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-display text-sm font-bold text-ink-700">
                  {section.label}
                </h2>
                <span className="text-xs text-ink-400">
                  {section.enrollmentCount} הרשמות · {section.groups.length}{" "}
                  {section.groups.length === 1 ? "לקוח" : "לקוחות"}
                </span>
                <span className="hidden h-px flex-1 bg-ink-100 sm:block" />
              </div>

              <ol className="relative space-y-4 sm:pe-12">
                <span
                  aria-hidden
                  className="absolute inset-y-2 end-[17px] hidden w-px bg-ink-100 sm:block"
                />
                {section.groups.map((group) => (
                  <ActivityParentRow key={group.id} group={group} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityParentRow({ group }: { group: ActivityParentGroup }) {
  const style = TYPE_STYLE[group.leadType];
  const parentName = group.parentName ?? "לקוח לא ידוע";

  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          "absolute end-0 top-5 hidden h-8 w-8 items-center justify-center rounded-full text-sm ring-4 ring-ink-50 sm:flex",
          style.dot
        )}
      >
        {style.icon}
      </span>

      <Card className="overflow-hidden transition-shadow hover:shadow-glow">
        <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={parentName} className="h-11 w-11 shrink-0 sm:h-10 sm:w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold text-ink-900 sm:text-sm">
                {parentName}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-start gap-x-3 gap-y-0.5 text-sm sm:text-xs">
                {group.parentPhone ? (
                  <a
                    href={`tel:${group.parentPhone}`}
                    dir="ltr"
                    className="text-ink-500 transition-colors hover:text-brand-600"
                  >
                    {group.parentPhone}
                  </a>
                ) : (
                  <span className="text-ink-400">ללא טלפון</span>
                )}
                <time
                  dateTime={group.created_at}
                  className="shrink-0 font-medium tabular-nums text-ink-500"
                >
                  {group.timeLabel}
                </time>
              </div>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-ink-100">
          {group.lines.map((line) => (
            <ActivityLineRow
              key={line.id}
              line={line}
              showLineTime={group.lines.length > 1}
            />
          ))}
        </ul>
      </Card>
    </li>
  );
}

function ActivityLineRow({
  line,
  showLineTime,
}: {
  line: ActivityEntry;
  showLineTime: boolean;
}) {
  const style = TYPE_STYLE[line.type];
  const status = ENROLLMENT_STATUS[line.status];
  const payment = ENROLLMENT_PAYMENT_STATUS[line.payment_status];

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              style.chip
            )}
          >
            {ENROLLMENT_TYPE[line.type]}
          </span>
          {line.childName ? (
            <Badge tone="brand" className="gap-1.5 text-sm">
              <Icon name="child" size={14} className="shrink-0 opacity-80" />
              {line.childName}
            </Badge>
          ) : (
            <Badge tone="neutral" className="gap-1.5 text-sm">
              <Icon name="user" size={14} className="shrink-0 opacity-80" />
              עבור ההורה
            </Badge>
          )}
          {showLineTime && (
            <time
              dateTime={line.created_at}
              className="hidden shrink-0 text-xs tabular-nums text-ink-400 sm:inline"
            >
              {line.timeLabel}
            </time>
          )}
        </div>

        <p className="break-words text-base font-medium leading-snug text-ink-900 sm:text-sm">
          {line.title}
        </p>

        <div className="flex flex-wrap gap-2 pt-0.5">
          {line.adminAssigned && <Badge tone="info">שיבוץ ידני</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={payment.tone}>{payment.label}</Badge>
        </div>
      </div>
    </li>
  );
}
