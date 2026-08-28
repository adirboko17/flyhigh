"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { saveCatalogClassOrder } from "@/lib/admin/catalogOrderActions";
import { sortByCatalogOrder } from "@/lib/classes/catalogOrder";
import { cn } from "@/utils/cn";
import type { PublicClass } from "@/types";

export function CatalogOrderDialog({
  classes,
  initialIds,
  onClose,
}: {
  classes: PublicClass[];
  initialIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [ordered, setOrdered] = useState<PublicClass[]>(() =>
    sortByCatalogOrder(classes, initialIds)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      ordered.map((cls) => cls.id).join(",") !==
      sortByCatalogOrder(classes, initialIds)
        .map((cls) => cls.id)
        .join(","),
    [classes, initialIds, ordered]
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    setError(null);
    setOrdered((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveCatalogClassOrder(ordered.map((cls) => cls.id));
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
      title="סדר בעמוד החוגים"
      description="שלושה בשורה, כמו באתר. החצים מתחת לשם מעבירים את החוג קדימה או אחורה."
      className="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-500">{ordered.length} חוגים</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              ביטול
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || ordered.length === 0 || !dirty}
            >
              {saving ? "שומרים..." : "שמירת הסדר"}
            </Button>
          </div>
        </div>
      }
    >
      {ordered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-400">
          אין חוגים פעילים להצגה בעמוד החוגים.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ordered.map((cls, index) => (
            <article
              key={cls.id}
              className="overflow-hidden rounded-[22px] border border-ink-100 bg-white shadow-soft"
            >
              <div className="relative aspect-[16/10] bg-ink-100">
                {cls.image_url ? (
                  <Image
                    src={cls.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-brand-600 text-white">
                    <Icon name="waves" size={36} />
                  </div>
                )}
              </div>
              <div className="px-4 pb-3 pt-3">
                <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-base font-extrabold leading-snug text-ink-900">
                  {cls.title}
                </h3>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <MoveButton
                    label="העברה קדימה"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <Icon name="chevron" size={16} className="rotate-180" />
                  </MoveButton>
                  <span className="min-w-6 text-center text-xs font-bold tabular-nums text-ink-400">
                    {index + 1}
                  </span>
                  <MoveButton
                    label="העברה אחורה"
                    disabled={index === ordered.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <Icon name="chevron" size={16} />
                  </MoveButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </Modal>
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
        "flex h-9 w-9 items-center justify-center rounded-full border border-ink-100 text-ink-600 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      )}
    >
      {children}
    </button>
  );
}
