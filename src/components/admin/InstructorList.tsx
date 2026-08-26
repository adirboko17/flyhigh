"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminRowActions } from "@/components/admin/AdminRowActions";
import { deleteAdminRow } from "@/components/admin/adminDelete";
import { InstructorForm } from "@/components/admin/InstructorForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/client";
import { instructorStatusLabel, instructorTitle } from "@/lib/instructors/labels";
import type { Enums } from "@/types/database.types";
import { formatCurrency } from "@/utils/format";
export type AdminInstructorRow = {
  id: string;
  full_name: string;
  gender: Enums<"gender_type"> | null;
  phone: string | null;
  hourly_rate: number | null;
  status: "active" | "inactive";
  profile_id: string | null;
  email: string | null;
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
  const [editing, setEditing] = useState<AdminInstructorRow | "new" | null>(
    null
  );

  const filtered = useMemo(
    () => instructors.filter((i) => matchesInstructor(i, query)),
    [instructors, query]
  );

  const formModal = (
    <Modal
      open={editing !== null}
      onClose={() => setEditing(null)}
      title={
        editing === "new"
          ? "מדריך חדש"
          : `עריכת ${instructorTitle(editing?.gender)}`
      }
      description={
        editing === "new"
          ? "בחרו מגדר כדי שבכרטיסי החוג יופיע מדריך או מדריכה."
          : undefined
      }
    >
      {editing !== null && (
        <InstructorForm
          existing={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Modal>
  );

  if (instructors.length === 0) {
    return (
      <>
        <EmptyState
          title="אין מדריכים עדיין"
          description="הוסיפו את המדריך או המדריכה הראשונים לצוות."
          action={
            <Button type="button" onClick={() => setEditing("new")}>
              + מדריך חדש
            </Button>
          }
        />
        {formModal}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <InstructorSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={instructors.length}
        onNew={() => setEditing("new")}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו מדריכים"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH className="hidden sm:table-cell">טלפון</TH>
                <TH className="hidden md:table-cell">תעריף שעתי</TH>
                <TH className="hidden lg:table-cell">חוגים</TH>
                <TH>סטטוס</TH>
                <TH className="w-14 sm:w-28">פעולות</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <Link
                      href={`/admin/instructors/${i.id}`}
                      className="flex items-center gap-2.5 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <Avatar name={i.full_name} className="shrink-0" />
                      <div className="min-w-0 max-w-[10rem] sm:max-w-[14rem]">
                        <span className="block truncate font-semibold text-ink-900">
                          {i.full_name}
                        </span>
                        {i.email ? (
                          <span
                            dir="ltr"
                            className="block truncate text-right text-xs text-ink-400"
                          >
                            {i.email}
                          </span>
                        ) : (
                          <span className="block text-xs text-ink-400">
                            ללא גישה למערכת
                          </span>
                        )}
                      </div>
                    </Link>
                  </TD>
                  <TD
                    dir="ltr"
                    className="hidden whitespace-nowrap text-right text-ink-600 sm:table-cell"
                  >
                    {i.phone ?? "—"}
                  </TD>
                  <TD className="hidden whitespace-nowrap font-medium md:table-cell">
                    {formatCurrency(i.hourly_rate)}
                  </TD>
                  <TD className="hidden lg:table-cell">{i.classCount}</TD>
                  <TD>
                    <Badge tone={i.status === "active" ? "success" : "neutral"}>
                      {instructorStatusLabel(i.status, i.gender)}
                    </Badge>
                  </TD>
                  <TD>
                    <AdminRowActions
                      onView={() => router.push(`/admin/instructors/${i.id}`)}
                      onEdit={() => setEditing(i)}
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

      {formModal}
    </div>
  );
}

function InstructorSearchBar({
  query,
  onQueryChange,
  resultCount,
  totalCount,
  onNew,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  onNew: () => void;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">חיפוש מדריכים</p>
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
              aria-label="חיפוש מדריכים"
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
          <Button
            type="button"
            onClick={onNew}
            className="h-12 shrink-0 px-6 sm:w-auto"
          >
            + מדריך חדש
          </Button>
        </div>
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגים כל {totalCount} המדריכים</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                מדריכים מתוך {totalCount}
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
