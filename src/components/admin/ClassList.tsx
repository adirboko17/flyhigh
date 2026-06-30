"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions, EyeMenuIcon, EyeOffMenuIcon } from "@/components/admin/AdminRowActions";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";
import { setClassStatus } from "@/lib/admin/classStatus";
import { CLASS_STATUS, dayLabel } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/utils/format";
export type AdminClassRow = {
  id: string;
  title: string;
  category: string | null;
  day_of_week: number | null;
  start_time: string | null;
  price: number;
  capacity: number;
  status: keyof typeof CLASS_STATUS;
  instructors: { full_name: string } | null;
};

interface ClassListProps {
  classes: AdminClassRow[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesClass(item: AdminClassRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.title).includes(q) ||
    normalizeSearch(item.category ?? "").includes(q) ||
    normalizeSearch(item.instructors?.full_name ?? "").includes(q)
  );
}

export function ClassList({ classes }: ClassListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => classes.filter((c) => matchesClass(c, query)),
    [classes, query]
  );

  if (classes.length === 0) {
    return (
      <EmptyState
        title="אין חוגים עדיין"
        description="צרו את החוג הראשון שלכם."
        action={<ButtonLink href="/admin/classes/new">+ חוג חדש</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ClassSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={classes.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו חוגים"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם החוג</TH>
                <TH>מדריכה</TH>
                <TH>יום ושעה</TH>
                <TH>מחיר</TH>
                <TH>מכסה</TH>
                <TH>סטטוס</TH>
                <TH className="w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((c) => (
                <TR key={c.id}>
                  <TD className="font-semibold text-ink-900">
                    {c.title}
                    {c.category && (
                      <span className="mr-2 text-xs font-normal text-ink-400">
                        {c.category}
                      </span>
                    )}
                  </TD>
                  <TD>{c.instructors?.full_name ?? "—"}</TD>
                  <TD className="text-ink-600">
                    יום {dayLabel(c.day_of_week)} · {formatTime(c.start_time)}
                  </TD>
                  <TD className="font-medium">{formatCurrency(c.price)}</TD>
                  <TD>{c.capacity}</TD>
                  <TD>
                    <Badge tone={CLASS_STATUS[c.status].tone}>
                      {CLASS_STATUS[c.status].label}
                    </Badge>
                  </TD>
                  <TD>
                    <AdminRowActions
                      editHref={`/admin/classes/${c.id}/edit`}
                      itemLabel={c.title}
                      extraMenuItems={
                        c.status === "inactive"
                          ? [
                              {
                                label: "הפעלה — הצגה באתר",
                                icon: <EyeMenuIcon className="text-brand-600" />,
                                onClick: async () => {
                                  const result = await setClassStatus(
                                    createClient(),
                                    c.id,
                                    "active"
                                  );
                                  if (result.error) {
                                    window.alert(result.error);
                                    return;
                                  }
                                  router.refresh();
                                },
                              },
                            ]
                          : [
                              {
                                label: "העברה ללא פעיל",
                                icon: <EyeOffMenuIcon className="text-ink-500" />,
                                onClick: async () => {
                                  const result = await setClassStatus(
                                    createClient(),
                                    c.id,
                                    "inactive"
                                  );
                                  if (result.error) {
                                    window.alert(result.error);
                                    return;
                                  }
                                  router.refresh();
                                },
                              },
                            ]
                      }
                      onDelete={async () => {
                        const result = await deleteAdminRow(
                          createClient(),
                          "classes",
                          c.id
                        );
                        if (!result.error) router.refresh();
                        return result;
                      }}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ClassSearchBar({
  query,
  onQueryChange,
  resultCount,
  totalCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">חיפוש חוגים</p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם חוג, מדריכה או קטגוריה
        </p>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="הקלידו שם חוג, מדריכה או קטגוריה..."
              className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
              aria-label="חיפוש חוגים"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute inset-y-0 end-3 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="ניקוי חיפוש"
              >
                <ClearIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <ButtonLink
            href="/admin/classes/new"
            className="h-12 shrink-0 px-6 sm:w-auto"
          >
            + חוג חדש
          </ButtonLink>
        </div>
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגים כל {totalCount} החוגים</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                חוגים מתוך {totalCount}
              </>
            )}
          </p>
        )}
      </div>
    </Card>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
