"use client";

import { useMemo, useState } from "react";
import { ClassCard } from "@/components/classes/ClassCard";
import { Icon } from "@/components/icons/Icon";
import {
  formatClassAudience,
  formatClassGenderPolicy,
} from "@/lib/class-audience";
import type { PublicClass } from "@/types";

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
    cls.interest_only ? "הרשמת עניין ללא תשלום" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function matchesClass(cls: PublicClass, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(classSearchHaystack(cls)).includes(q);
}

export function ClassesCatalog({ classes }: { classes: PublicClass[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => classes.filter((cls) => matchesClass(cls, query)),
    [classes, query]
  );
  const isSearching = query.trim().length > 0;

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

        <div className="flex h-[3.25rem] items-center overflow-hidden rounded-full border border-ink-100 bg-white shadow-soft transition-shadow focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgba(14,165,196,0.12)]">
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

        <p className="mt-3 text-sm text-ink-500">
          {isSearching
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
            onClick={() => setQuery("")}
            className="mt-4 text-sm font-bold text-brand-600 hover:underline"
          >
            ניקוי החיפוש
          </button>
        </div>
      )}
    </div>
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
