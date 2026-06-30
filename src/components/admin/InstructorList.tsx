"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { Avatar } from "@/components/ui/Avatar";import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/format";
export type AdminInstructorRow = {
  id: string;
  full_name: string;
  phone: string | null;
  hourly_rate: number | null;
  status: "active" | "inactive";
  classCount: number;
};

interface InstructorListProps {
  instructors: AdminInstructorRow[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesInstructor(item: AdminInstructorRow, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(item.full_name).includes(q) ||
    normalizeSearch(item.phone ?? "").includes(q)
  );
}

export function InstructorList({ instructors }: InstructorListProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => instructors.filter((i) => matchesInstructor(i, query)),
    [instructors, query]
  );

  if (instructors.length === 0) {
    return (
      <EmptyState
        title="אין מדריכות עדיין"
        description="הוסיפו את המדריכה הראשונה לצוות."
        action={
          <ButtonLink href="/admin/instructors/new">+ מדריכה חדשה</ButtonLink>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <InstructorSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={instructors.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו מדריכות"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>טלפון</TH>
                <TH>תעריף שעתי</TH>
                <TH>חוגים</TH>
                <TH>סטטוס</TH>
                <TH className="w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={i.full_name} />
                      <span className="font-semibold text-ink-900">
                        {i.full_name}
                      </span>
                    </div>
                  </TD>
                  <TD dir="ltr" className="text-right text-ink-600">
                    {i.phone ?? "—"}
                  </TD>
                  <TD className="font-medium">
                    {formatCurrency(i.hourly_rate)}
                  </TD>
                  <TD>{i.classCount}</TD>
                  <TD>
                    <Badge tone={i.status === "active" ? "success" : "neutral"}>
                      {i.status === "active" ? "פעילה" : "לא פעילה"}
                    </Badge>
                  </TD>
                  <TD>
                    <AdminRowActions
                      editHref={`/admin/instructors/${i.id}/edit`}
                      itemLabel={i.full_name}
                      onDelete={async () => {
                        const result = await deleteAdminRow(
                          createClient(),
                          "instructors",
                          i.id
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

function InstructorSearchBar({
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
        <p className="text-sm font-medium text-ink-600">חיפוש מדריכות</p>
        <p className="mt-0.5 text-xs text-ink-400">לפי שם או טלפון</p>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="הקלידו שם או טלפון..."
              className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
              aria-label="חיפוש מדריכות"
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
            href="/admin/instructors/new"
            className="h-12 shrink-0 px-6 sm:w-auto"
          >
            + מדריכה חדשה
          </ButtonLink>
        </div>
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגות כל {totalCount} המדריכות</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                מדריכות מתוך {totalCount}
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
