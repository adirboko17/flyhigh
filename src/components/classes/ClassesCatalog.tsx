"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClassCard } from "@/components/classes/ClassCard";
import { Icon } from "@/components/icons/Icon";
import {
  CLASS_GENDER_POLICY,
  formatClassAudience,
  formatClassGenderPolicy,
  type ClassGenderPolicy,
} from "@/lib/class-audience";
import { cn } from "@/utils/cn";
import type { PublicClass } from "@/types";

type GenderFilter = "all" | ClassGenderPolicy;

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "male", label: CLASS_GENDER_POLICY.male },
  { value: "female", label: CLASS_GENDER_POLICY.female },
  { value: "mixed", label: CLASS_GENDER_POLICY.mixed },
];

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()'"׳״]/g, "");
}

function classSearchHaystack(cls: PublicClass) {
  return [
    cls.title,
    cls.category,
    cls.description,
    cls.instructor_name,
    cls.level,
    formatClassAudience(cls),
    formatClassGenderPolicy(cls.gender_policy),
    cls.interest_only ? "הרשמת עניין" : "",
    ...(cls.weekly_slots ?? []).map((slot) => slot.start_time.slice(0, 5)),
  ]
    .filter(Boolean)
    .join(" ");
}

function matchesClass(cls: PublicClass, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(classSearchHaystack(cls)).includes(q);
}

function matchesGender(cls: PublicClass, filter: GenderFilter) {
  if (filter === "all") return true;
  if (cls.gender_policy === filter) return true;
  if (filter === "mixed") return false;
  return (cls.weekly_slots ?? []).some((slot) => slot.gender_policy === filter);
}

export function ClassesCatalog({ classes }: { classes: PublicClass[] }) {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const filtered = useMemo(
    () =>
      classes.filter(
        (cls) => matchesClass(cls, query) && matchesGender(cls, gender)
      ),
    [classes, query, gender]
  );
  const isSearching = query.trim().length > 0;
  const isFiltering = isSearching || gender !== "all";

  function clearFilters() {
    setQuery("");
    setGender("all");
  }

  return (
    <div>
      <div className="mb-6">
        <label
          htmlFor="class-search"
          className="mb-2.5 inline-flex items-center gap-2 text-[13px] font-bold tracking-wide text-[var(--logo-cyan)]"
        >
          <span className="h-0.5 w-4 rounded-full bg-[var(--logo-cyan)]" />
          חיפוש חוג
        </label>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-[3.25rem] min-w-0 flex-1 items-center overflow-hidden rounded-full border border-ink-100 bg-white shadow-soft transition-shadow focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgba(14,165,196,0.12)]">
            <span
              aria-hidden
              className="ms-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-gradient-soft)] text-brand-600"
            >
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              id="class-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="שם חוג, קטגוריה או קהל יעד..."
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="me-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="ניקוי חיפוש"
              >
                <Icon name="x" size={15} />
              </button>
            )}
          </div>

          <GenderFilterMenu
            className="sm:hidden"
            value={gender}
            onChange={setGender}
          />

          <div
            role="group"
            aria-label="סינון לפי קהל"
            className="hidden h-[3.25rem] shrink-0 items-center gap-1 rounded-full border border-ink-100 bg-white p-1 shadow-soft sm:flex"
          >
            {GENDER_FILTERS.map((option) => {
              const selected = gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGender(option.value)}
                  className={cn(
                    "h-full min-w-[3.75rem] rounded-full px-3.5 text-sm font-semibold transition-colors",
                    selected
                      ? "bg-brand-600 text-white shadow-soft"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-800"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-sm text-ink-500">
          {isFiltering
            ? filtered.length === 1
              ? "נמצא חוג אחד"
              : `נמצאו ${filtered.length} חוגים`
            : `${classes.length} חוגים פעילים`}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cls) => (
            <div key={cls.id} className="h-full">
              <ClassCard cls={cls} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center">
          <p className="font-display text-lg font-bold text-ink-800">
            לא נמצאו חוגים תואמים
          </p>
          <p className="mt-1 text-sm text-ink-500">
            נסו שם אחר, קטגוריה או קהל יעד — למשל נינג׳ה, שחייה או בנים.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 text-sm font-bold text-brand-600 hover:underline"
          >
            ניקוי הסינון
          </button>
        </div>
      )}
    </div>
  );
}

function GenderFilterMenu({
  value,
  onChange,
  className,
}: {
  value: GenderFilter;
  onChange: (value: GenderFilter) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = GENDER_FILTERS.find((option) => option.value === value);
  const active = value !== "all";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="סינון לפי קהל"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-[3.25rem] items-center gap-2 rounded-full border px-3.5 text-sm font-semibold shadow-soft transition-colors",
          active || open
            ? "border-brand-200 bg-brand-600 text-white"
            : "border-ink-100 bg-white text-ink-700"
        )}
      >
        <FilterIcon className="h-4 w-4" />
        <span>{active ? selected?.label : "סינון"}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="קהל יעד"
          className="absolute end-0 z-30 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-ink-100 bg-white py-1 shadow-card"
        >
          {GENDER_FILTERS.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors",
                  isSelected
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-700 hover:bg-ink-50"
                )}
              >
                {option.label}
                {isSelected ? <Icon name="check" size={15} /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
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
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
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
