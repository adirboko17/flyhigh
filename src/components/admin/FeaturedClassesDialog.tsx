"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminClassRow } from "@/components/admin/ClassList";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { saveHomeFeaturedClasses } from "@/lib/admin/featuredClassActions";
import { CLASS_STATUS } from "@/lib/constants";
import { HOME_FEATURED_LIMIT } from "@/lib/home/featuredClasses";
import { cn } from "@/utils/cn";

function normalizeSearch(value: string) {
  return value.toLowerCase().trim().replace(/[\s\-()]/g, "");
}

export function FeaturedClassesDialog({
  classes,
  initialIds,
  onClose,
}: {
  classes: AdminClassRow[];
  initialIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    initialIds.filter((id) => classes.some((cls) => cls.id === id)).slice(0, HOME_FEATURED_LIMIT)
  );
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(classes.map((cls) => [cls.id, cls])),
    [classes]
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return classes;
    return classes.filter(
      (cls) =>
        normalizeSearch(cls.title).includes(q) ||
        normalizeSearch(cls.category ?? "").includes(q) ||
        normalizeSearch(cls.instructors?.full_name ?? "").includes(q)
    );
  }, [classes, query]);

  function toggleClass(id: string) {
    setError(null);
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= HOME_FEATURED_LIMIT) return current;
      return [...current, id];
    });
  }

  function clearSlot(id: string) {
    setError(null);
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveHomeFeaturedClasses(selectedIds);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "השמירה נכשלה.");
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="חוגים מובילים"
      description="בחרו עד 3 חוגים שיוצגו בדף הבית. הסדר כאן הוא הסדר באתר."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <ol className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: HOME_FEATURED_LIMIT }, (_, index) => {
            const id = selectedIds[index];
            const cls = id ? byId.get(id) : undefined;
            return (
              <li
                key={id ?? `empty-${index}`}
                className={cn(
                  "flex min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3 py-2.5",
                  cls
                    ? "border-brand-200 bg-brand-50/70"
                    : "border-dashed border-ink-200 bg-ink-50/50"
                )}
              >
                <p className="text-[11px] font-semibold text-ink-400">
                  מקום {index + 1}
                </p>
                {cls ? (
                  <div className="mt-1 flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold text-ink-900">
                      {cls.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => clearSlot(cls.id)}
                      className="shrink-0 text-xs font-semibold text-ink-400 hover:text-ink-700"
                    >
                      הסרה
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-ink-400">טרם נבחר</p>
                )}
              </li>
            );
          })}
        </ol>

        <div>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש חוג..."
            aria-label="חיפוש חוג לבחירה"
            className="h-11"
          />
          <p className="mt-2 text-xs text-ink-400">
            נבחרו {selectedIds.length} מתוך {HOME_FEATURED_LIMIT}
          </p>
        </div>

        <ul className="divide-y divide-ink-50 overflow-hidden rounded-2xl border border-ink-100">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-ink-400">
              לא נמצאו חוגים
            </li>
          ) : (
            filtered.map((cls) => {
              const selectedIndex = selectedIds.indexOf(cls.id);
              const selected = selectedIndex >= 0;
              const full = !selected && selectedIds.length >= HOME_FEATURED_LIMIT;
              const publicReady =
                cls.status === "active" || cls.status === "full";

              return (
                <li key={cls.id}>
                  <button
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    disabled={full}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-4 py-3 text-start transition-colors",
                      selected
                        ? "bg-brand-50"
                        : full
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-ink-50"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">
                        {cls.title}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        <Badge tone={CLASS_STATUS[cls.status].tone}>
                          {CLASS_STATUS[cls.status].label}
                        </Badge>
                        {cls.category && (
                          <Badge tone="brand">{cls.category}</Badge>
                        )}
                        {!publicReady && (
                          <Badge tone="warning">לא מוצג באתר</Badge>
                        )}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        selected
                          ? "bg-brand-600 text-white"
                          : "border border-ink-200 text-ink-300"
                      )}
                    >
                      {selected ? selectedIndex + 1 : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            ביטול
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "שומרים..." : "שמירת בחירה"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
