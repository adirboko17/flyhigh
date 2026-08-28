"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminClassRow } from "@/components/admin/ClassList";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { saveHomeFeaturedClasses } from "@/lib/admin/featuredClassActions";
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
    initialIds
      .filter((id) => classes.some((cls) => cls.id === id))
      .slice(0, HOME_FEATURED_LIMIT)
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

  function moveSlot(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= selectedIds.length) return;
    setError(null);
    setSelectedIds((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
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
      description="עד 3 חוגים בדף הבית. בחרו מהרשימה, והסדר כאן הוא הסדר באתר."
      className="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-500">
            נבחרו {selectedIds.length} מתוך {HOME_FEATURED_LIMIT}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "שומרים..." : "שמירת בחירה"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <ol className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: HOME_FEATURED_LIMIT }, (_, index) => {
            const id = selectedIds[index];
            const cls = id ? byId.get(id) : undefined;
            return (
              <li key={id ?? `empty-${index}`}>
                {cls ? (
                  <FeaturedSlotCard
                    cls={cls}
                    place={index + 1}
                    canMoveEarlier={index > 0}
                    canMoveLater={index < selectedIds.length - 1}
                    onMoveEarlier={() => moveSlot(index, -1)}
                    onMoveLater={() => moveSlot(index, 1)}
                    onRemove={() => clearSlot(cls.id)}
                  />
                ) : (
                  <div className="flex min-h-[12.5rem] flex-col items-center justify-center rounded-[22px] border border-dashed border-ink-200 bg-ink-50/70 px-4 text-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-ink-400 ring-1 ring-ink-100">
                      {index + 1}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ink-500">
                      מקום {index + 1} פנוי
                    </p>
                    <p className="mt-1 text-xs text-ink-400">
                      לחצו על חוג למטה כדי לבחור
                    </p>
                  </div>
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
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">לא נמצאו חוגים</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cls) => {
              const selectedIndex = selectedIds.indexOf(cls.id);
              const selected = selectedIndex >= 0;
              const full = !selected && selectedIds.length >= HOME_FEATURED_LIMIT;
              const publicReady =
                cls.status === "active" || cls.status === "full";

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  disabled={full}
                  className={cn(
                    "overflow-hidden rounded-[22px] border bg-white text-right shadow-soft transition-all",
                    selected
                      ? "border-brand-400 ring-2 ring-brand-100"
                      : "border-ink-100 hover:border-brand-200",
                    full && "cursor-not-allowed opacity-40"
                  )}
                >
                  <div className="relative aspect-[16/10] bg-ink-100">
                    <ClassImage cls={cls} />
                    <span
                      className={cn(
                        "absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-soft",
                        selected
                          ? "bg-brand-600 text-white"
                          : "bg-white/90 text-ink-400"
                      )}
                    >
                      {selected ? selectedIndex + 1 : ""}
                    </span>
                    {!publicReady && (
                      <span className="absolute start-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        לא באתר
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 px-4 py-3 text-sm font-extrabold leading-snug text-ink-900">
                    {cls.title}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function FeaturedSlotCard({
  cls,
  place,
  canMoveEarlier,
  canMoveLater,
  onMoveEarlier,
  onMoveLater,
  onRemove,
}: {
  cls: AdminClassRow;
  place: number;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-brand-200 bg-white shadow-soft">
      <div className="relative aspect-[16/10] bg-ink-100">
        <ClassImage cls={cls} />
        <span className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-soft">
          {place}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink-600 shadow-soft hover:bg-white hover:text-ink-900"
        >
          הסרה
        </button>
      </div>
      <div className="px-4 pb-3 pt-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-sm font-extrabold leading-snug text-ink-900">
          {cls.title}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-2">
          <MoveButton
            label="העברה קדימה"
            disabled={!canMoveEarlier}
            onClick={onMoveEarlier}
          >
            <Icon name="chevron" size={15} className="rotate-180" />
          </MoveButton>
          <MoveButton
            label="העברה אחורה"
            disabled={!canMoveLater}
            onClick={onMoveLater}
          >
            <Icon name="chevron" size={15} />
          </MoveButton>
        </div>
      </div>
    </article>
  );
}

function ClassImage({ cls }: { cls: Pick<AdminClassRow, "image_url" | "title"> }) {
  if (!cls.image_url) {
    return (
      <div className="flex h-full items-center justify-center bg-brand-600 text-white">
        <Icon name="waves" size={32} />
      </div>
    );
  }

  return (
    <Image
      src={cls.image_url}
      alt=""
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover"
      unoptimized
    />
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 text-ink-600 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      {children}
    </button>
  );
}
