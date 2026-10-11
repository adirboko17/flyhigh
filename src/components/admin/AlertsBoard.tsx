"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import type { AdminAlert, AdminAlertKind, AlertTab } from "@/lib/admin/alertTypes";
import { cn } from "@/utils/cn";

const TABS: { id: AlertTab; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "collection", label: "גבייה" },
  { id: "membership", label: "מנויים" },
  { id: "absence", label: "היעדרויות" },
];

const KIND_LABEL: Record<AdminAlertKind, string> = {
  collection: "גבייה",
  membership: "מנויים",
  absence: "היעדרויות",
};

const KIND_ICON: Record<AdminAlertKind, string> = {
  collection: "🧾",
  membership: "🎫",
  absence: "🚫",
};

const TONE_ICON: Record<AdminAlert["tone"], string> = {
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-sky-50 text-sky-700",
};

const TAB_HINT: Record<AlertTab, string> = {
  all: "גבייה פתוחה, מנויים לקראת סיום, והיעדרות של שני מפגשים ברציפות.",
  collection:
    "חיובים פתוחים במשרד, מהישן לחדש. אחרי שבוע זה ממתין, ואחרי שבועיים באיחור.",
  membership:
    "מנוי פעיל שמסתיים ב-14 הימים הקרובים, או שפג תוקפו ב-30 הימים האחרונים.",
  absence:
    "לקוח שעדיין רשום לחוג, ושני המפגשים האחרונים שסומנו לו הם היעדרות.",
};

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesAlert(alert: AdminAlert, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return [alert.title, alert.detail, alert.meta, alert.phone, alert.statusLabel]
    .some((part) => normalizeSearch(part ?? "").includes(q));
}

function actionLabel(alert: AdminAlert) {
  return alert.kind === "collection" ? "לגבייה" : "ללקוח";
}

export function AlertsBoard({
  alerts,
  initialTab,
}: {
  alerts: AdminAlert[];
  initialTab: AlertTab;
}) {
  const [tab, setTab] = useState<AlertTab>(initialTab);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => alerts.filter((alert) => matchesAlert(alert, query)),
    [alerts, query]
  );

  const visible = useMemo(
    () =>
      tab === "all" ? filtered : filtered.filter((alert) => alert.kind === tab),
    [filtered, tab]
  );

  const counts = useMemo(() => {
    const byKind = { collection: 0, membership: 0, absence: 0 };
    const unseen = { collection: 0, membership: 0, absence: 0 };
    for (const alert of alerts) {
      byKind[alert.kind] += 1;
      if (alert.unseen) unseen[alert.kind] += 1;
    }
    return { byKind, unseen };
  }, [alerts]);

  const overdueCollections = alerts.filter(
    (alert) => alert.kind === "collection" && alert.tone !== "info"
  ).length;

  const grouped = useMemo(() => {
    if (tab !== "all") return null;
    return (["collection", "membership", "absence"] as const)
      .map((kind) => ({
        kind,
        items: visible.filter((alert) => alert.kind === kind),
      }))
      .filter((group) => group.items.length > 0);
  }, [tab, visible]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="התראות"
        description="מה שדורש טיפול עכשיו. התג האדום בתפריט יורד רק אחרי כניסה לכאן."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTab("collection")}
          className="w-full text-start"
        >
          <StatCard
            label="גבייה פתוחה"
            value={counts.byKind.collection}
            icon="🧾"
            tone={overdueCollections > 0 ? "amber" : "aqua"}
            hint={
              overdueCollections > 0
                ? `${overdueCollections} ממתינים שבוע ומעלה`
                : "אין חיובים שממתינים שבוע"
            }
          />
        </button>
        <button
          type="button"
          onClick={() => setTab("membership")}
          className="w-full text-start"
        >
          <StatCard
            label="מנויים לסיום"
            value={counts.byKind.membership}
            icon="🎫"
            tone={counts.byKind.membership > 0 ? "rose" : "aqua"}
            hint="14 יום לפני תום המנוי"
          />
        </button>
        <button
          type="button"
          onClick={() => setTab("absence")}
          className="w-full text-start"
        >
          <StatCard
            label="היעדרויות ברצף"
            value={counts.byKind.absence}
            icon="🚫"
            tone={counts.byKind.absence > 0 ? "rose" : "aqua"}
            hint="שני מפגשים מסומנים נעדר"
          />
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-3 py-3 sm:px-5 sm:py-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי שם, חוג, מנוי או טלפון..."
            className="h-11 border-ink-100 bg-ink-50/50 focus:bg-white"
            aria-label="חיפוש התראות"
          />
          <div
            role="tablist"
            aria-label="סוג התראה"
            className="flex w-full flex-wrap gap-1 rounded-2xl bg-ink-100 p-1"
          >
            {TABS.map((item) => {
              const count =
                item.id === "all" ? alerts.length : counts.byKind[item.id];
              const hasNew =
                item.id === "all"
                  ? alerts.some((alert) => alert.unseen)
                  : counts.unseen[item.id] > 0;
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 py-2 text-[13px] font-semibold transition-colors sm:flex-none sm:px-3 sm:text-sm",
                    selected
                      ? "bg-white text-brand-700 shadow-soft"
                      : "text-ink-500 hover:text-ink-800"
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[11px]",
                      selected ? "bg-brand-50 text-brand-700" : "bg-white/70 text-ink-500"
                    )}
                  >
                    {count}
                  </span>
                  {hasNew && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-red-500"
                      aria-label="יש חדשות"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-ink-500">{TAB_HINT[tab]}</p>
        </div>

        {alerts.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon="✨"
              title="אין התראות פתוחות"
              description="כשחיוב ממתין, מנוי עומד להסתיים, או לקוח נעדר פעמיים ברציפות — זה יופיע כאן."
              className="border-0 bg-transparent"
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={query ? "🔎" : "✨"}
              title={query ? "אין תוצאות" : "אין התראות בקטגוריה הזו"}
              description={
                query ? "נסו שם אחר, או עברו לטאב אחר." : TAB_HINT[tab]
              }
              className="border-0 bg-transparent"
            />
          </div>
        ) : grouped ? (
          <div>
            {grouped.map((group) => (
              <section key={group.kind}>
                <h2 className="bg-ink-50/80 px-4 py-2 text-xs font-bold tracking-wide text-ink-500 sm:px-5">
                  {KIND_LABEL[group.kind]}
                </h2>
                <AlertRows alerts={group.items} />
              </section>
            ))}
          </div>
        ) : (
          <AlertRows alerts={visible} />
        )}
      </Card>
    </div>
  );
}

function AlertRows({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <ul className="divide-y divide-ink-100">
      {alerts.map((alert) => (
        <li
          key={alert.key}
          className={cn(
            "flex flex-col gap-3 border-s-2 px-4 py-4 sm:flex-row sm:items-center sm:px-5",
            alert.unseen ? "border-red-500 bg-red-50/40" : "border-transparent"
          )}
        >
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg",
              TONE_ICON[alert.tone]
            )}
            aria-hidden
          >
            {KIND_ICON[alert.kind]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-ink-900">{alert.title}</p>
              {alert.unseen && <Badge tone="danger">חדש</Badge>}
              <Badge
                tone={
                  alert.tone === "danger"
                    ? "danger"
                    : alert.tone === "warning"
                      ? "warning"
                      : "info"
                }
              >
                {alert.statusLabel}
              </Badge>
            </div>
            {alert.detail && (
              <p className="mt-0.5 text-sm text-ink-600">{alert.detail}</p>
            )}
            <p className="mt-0.5 text-xs text-ink-400">{alert.meta}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
            {alert.amountLabel && (
              <p className="font-display text-base font-bold text-ink-900">
                {alert.amountLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {alert.phone && (
                <a
                  href={`tel:${alert.phone}`}
                  dir="ltr"
                  className="text-sm font-semibold text-ink-600 hover:text-ink-900"
                >
                  {alert.phone}
                </a>
              )}
              {alert.href && (
                <Link
                  href={alert.href}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  {actionLabel(alert)}
                </Link>
              )}
              {alert.customerHref && alert.customerHref !== alert.href && (
                <Link
                  href={alert.customerHref}
                  className="text-sm font-semibold text-ink-500 hover:text-ink-800 hover:underline"
                >
                  ללקוח
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
