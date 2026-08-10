"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { GENDER } from "@/lib/constants";
import { formatSchoolGrade } from "@/lib/school-grade";
import { cn } from "@/utils/cn";
import { calcAge, formatDate } from "@/utils/format";
export type CustomerChild = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  school_grade: number | null;
  grade_school_year: number | null;
  notes: string | null;
  created_at: string;
};

export type CustomerWithChildren = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  children: CustomerChild[];
};

interface CustomerListProps {
  customers: CustomerWithChildren[];
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

function matchesCustomer(customer: CustomerWithChildren, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return (
    normalizeSearch(customer.full_name).includes(q) ||
    normalizeSearch(customer.email ?? "").includes(q) ||
    normalizeSearch(customer.phone ?? "").includes(q)
  );
}

export function CustomerList({ customers }: CustomerListProps) {
  const [selected, setSelected] = useState<CustomerWithChildren | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => customers.filter((c) => matchesCustomer(c, query)),
    [customers, query]
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  if (customers.length === 0) {
    return <EmptyState title="אין לקוחות עדיין" />;
  }

  return (
    <div className="space-y-4">
      <CustomerSearchBar
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        totalCount={customers.length}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="לא נמצאו לקוחות"
          description="נסו מונח חיפוש אחר או נקו את השדה"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>טלפון</TH>
                <TH className="hidden md:table-cell">אימייל</TH>
                <TH>ילדים</TH>
                <TH className="hidden sm:table-cell">הצטרף</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((customer) => {
              const kids = customer.children.length;
              return (
                <TR
                  key={customer.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(customer)}
                >
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={customer.full_name} className="shrink-0" />
                      <span className="max-w-[9rem] truncate font-semibold text-ink-900 sm:max-w-none">
                        {customer.full_name}
                      </span>
                    </div>
                  </TD>
                  <TD dir="ltr" className="whitespace-nowrap text-right text-ink-600">
                    {customer.phone ?? "—"}
                  </TD>
                  <TD
                    dir="ltr"
                    className="hidden max-w-[14rem] truncate text-right text-ink-600 md:table-cell"
                  >
                    {customer.email ?? "—"}
                  </TD>
                  <TD>
                    {kids > 0 ? (
                      <Badge
                        tone="brand"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(customer);
                        }}
                      >
                        {kids} {kids === 1 ? "ילד" : "ילדים"}
                      </Badge>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </TD>
                  <TD className="hidden whitespace-nowrap text-ink-500 sm:table-cell">
                    {formatDate(customer.created_at)}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
      )}

      {selected && (
        <CustomerDetailPanel
          customer={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function CustomerSearchBar({
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
        <p className="text-sm font-medium text-ink-600">חיפוש לקוחות</p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם, טלפון או דוא״ל
        </p>
      </div>
      <div className="p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="הקלידו שם, טלפון או דוא״ל..."
            className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
            aria-label="חיפוש לקוחות"
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
        {isSearching && (
          <p className="mt-3 text-sm text-ink-500">
            {resultCount === totalCount ? (
              <>מוצגים כל {totalCount} הלקוחות</>
            ) : (
              <>
                נמצאו{" "}
                <span className="font-semibold text-brand-700">{resultCount}</span>{" "}
                לקוחות מתוך {totalCount}
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

function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: CustomerWithChildren;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="סגירה"
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-panel-title"
        className={cn(
          "relative z-10 ms-auto flex h-full w-full max-w-lg flex-col",
          "border-s border-ink-100 bg-white shadow-card animate-fade-in"
        )}
      >
        <div className="bg-brand-gradient px-5 pb-8 pt-6 text-white sm:px-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/25"
            >
              סגירה
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Avatar
              name={customer.full_name}
              className="h-14 w-14 border-2 border-white/30 text-lg"
            />
            <div className="min-w-0">
              <h2
                id="customer-panel-title"
                className="truncate font-display text-xl font-bold sm:text-2xl"
              >
                {customer.full_name}
              </h2>
              <p className="mt-0.5 text-sm text-white/80">כרטיס לקוח</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <DetailRow label="טלפון" dir="ltr">
                {customer.phone ?? "—"}
              </DetailRow>
              <DetailRow label="דוא״ל" dir="ltr">
                {customer.email ?? "—"}
              </DetailRow>
              <DetailRow label="תאריך לידה">
                {customer.birth_date ? formatDate(customer.birth_date) : "—"}
              </DetailRow>
              <DetailRow label="עיר">{customer.city ?? "—"}</DetailRow>
              <DetailRow label="כתובת">{customer.address ?? "—"}</DetailRow>
              <DetailRow label="תאריך הצטרפות">
                {formatDate(customer.created_at)}
              </DetailRow>
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink-900">
                ילדים
              </h3>
              {customer.children.length > 0 && (
                <Badge tone="brand">{customer.children.length}</Badge>
              )}
            </div>

            {customer.children.length > 0 ? (
              <div className="flex flex-col gap-3">
                {customer.children.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>
            ) : (
              <Card className="bg-ink-50/60">
                <CardContent className="py-8 text-center text-sm text-ink-500">
                  אין ילדים רשומים ללקוח זה
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailRow({
  label,
  children,
  dir,
}: {
  label: string;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-ink-500">{label}</span>
      <span
        dir={dir}
        className="min-w-0 break-words text-end text-sm font-medium text-ink-900"
      >
        {children}
      </span>
    </div>
  );
}

function ChildCard({ child }: { child: CustomerChild }) {
  const age = calcAge(child.birth_date);
  const grade = formatSchoolGrade(child.school_grade, child.grade_school_year);

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar name={child.full_name} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-900">{child.full_name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {grade && <Badge tone="brand">{grade}</Badge>}
            {age !== null && (
              <Badge tone="neutral">גיל {age}</Badge>
            )}
            {child.gender && (
              <Badge tone="info">{GENDER[child.gender]}</Badge>
            )}
            {child.birth_date && (
              <Badge tone="neutral">{formatDate(child.birth_date)}</Badge>
            )}
          </div>
          {child.notes && (
            <p className="mt-2 text-sm text-ink-500">{child.notes}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
