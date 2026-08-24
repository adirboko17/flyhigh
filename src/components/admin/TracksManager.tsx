"use client";

import { useState } from "react";
import { PoolPassList, type AdminPoolPassRow } from "@/components/admin/PoolPassList";
import {
  PrivateLessonList,
  type AdminPrivateLessonRow,
} from "@/components/admin/PrivateLessonList";
import { ProgramList, type AdminProgramRow } from "@/components/admin/ProgramList";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface TracksManagerProps {
  programs: AdminProgramRow[];
  passes: AdminPoolPassRow[];
  privateLessons: AdminPrivateLessonRow[];
}

export function TracksManager({
  programs,
  passes,
  privateLessons,
}: TracksManagerProps) {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-5">
      <TracksSearchBar query={query} onQueryChange={setQuery} />
      <ProgramList programs={programs} query={query} kind="membership" />
      <ProgramList programs={programs} query={query} kind="activity" />
      <PoolPassList passes={passes} query={query} />
      <PrivateLessonList lessons={privateLessons} query={query} />
    </div>
  );
}

function TracksSearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const isSearching = query.trim().length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-100 bg-[var(--brand-gradient-soft)] px-5 py-4">
        <p className="text-sm font-medium text-ink-600">
          חיפוש מנויים, פעילויות, כניסות ושיעורים פרטיים
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          לפי שם או תיאור — מסנן את כל הרשימות יחד
        </p>
      </div>
      <div className="p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute inset-y-0 start-4 my-auto h-[18px] w-[18px] text-ink-400" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="הקלידו שם או תיאור..."
            className="h-12 border-ink-100 bg-ink-50/50 ps-11 pe-11 shadow-soft focus:bg-white"
            aria-label="חיפוש מנויים, פעילויות, כניסות ושיעורים פרטיים"
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
