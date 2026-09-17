"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Modal } from "@/components/ui/Modal";
import {
  COLLECTION_PAYMENT_METHODS,
  PAYMENT_METHOD,
  type CollectionPaymentMethod,
} from "@/lib/constants";
import { cn } from "@/utils/cn";

type StatusFilter = "open" | "paid" | "all";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "open", label: "חובות פתוחים" },
  { id: "paid", label: "שולמו" },
  { id: "all", label: "הכל" },
];

function exportHref(scope: StatusFilter, methods: CollectionPaymentMethod[]) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (methods.length > 0) params.set("methods", methods.join(","));
  return `/admin/collections/export?${params.toString()}`;
}

export function CollectionsExportDialog({
  open,
  onClose,
  statusFilter,
  methodFilter,
}: {
  open: boolean;
  onClose: () => void;
  statusFilter: StatusFilter;
  methodFilter: CollectionPaymentMethod[];
}) {
  const [scope, setScope] = useState<StatusFilter>(statusFilter);
  const [methods, setMethods] = useState<CollectionPaymentMethod[]>(methodFilter);

  useEffect(() => {
    if (!open) return;
    setScope(statusFilter);
    setMethods(methodFilter);
  }, [open, statusFilter, methodFilter]);

  const customHref = useMemo(
    () => exportHref(scope, methods),
    [scope, methods]
  );

  function toggleMethod(method: CollectionPaymentMethod) {
    setMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method]
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ייצוא Excel"
      description="דוח מסודר לפי אמצעי תשלום, או רשימת כל החייבים."
      className="max-w-lg"
    >
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <PresetLink
            href={exportHref("open", [])}
            title="כל החייבים"
            hint="כל מי שיש לו יתרה פתוחה, בכל אמצעי התשלום"
          />
          <PresetLink
            href={exportHref(statusFilter, methodFilter)}
            title="מה שמוצג עכשיו"
            hint="לפי הסינון שמופעל בעמוד הגבייה"
          />
          <PresetLink
            href={exportHref("open", ["amit", "maccabi"])}
            title="עמית + מכבי/לאומית"
            hint="חובות פתוחים בשני האמצעים, עם גיליון נפרד לכל אחד"
          />
          <PresetLink
            href={exportHref("open", ["amit"])}
            title="עמית"
            hint="רק מי שמשלם דרך עמית"
          />
          <PresetLink
            href={exportHref("open", ["maccabi"])}
            title="מכבי/לאומית"
            hint="רק מי שמשלם דרך מכבי או לאומית"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink-800">בחירה מותאמת</p>
          <p className="mb-3 text-xs text-ink-500">
            בחרו אמצעי תשלום — אפשר כמה יחד. בלי בחירה ייכללו כולם.
          </p>
          <div className="flex flex-wrap gap-2">
            {COLLECTION_PAYMENT_METHODS.map((method) => {
              const active = methods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => toggleMethod(method)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800"
                  )}
                >
                  {PAYMENT_METHOD[method]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 rounded-2xl bg-ink-100 p-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setScope(option.id)}
                aria-pressed={scope === option.id}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                  scope === option.id
                    ? "bg-white text-brand-700 shadow-soft"
                    : "text-ink-500 hover:text-ink-800"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <a
          href={customHref}
          onClick={onClose}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-700"
        >
          <Icon name="download" size={16} />
          הורדת הדוח שנבחר
        </a>
      </div>
    </Modal>
  );
}

function PresetLink({
  href,
  title,
  hint,
}: {
  href: string;
  title: string;
  hint: string;
}) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-ink-100 bg-ink-50/70 px-4 py-3 text-right transition-colors hover:border-brand-200 hover:bg-brand-50/50"
    >
      <span className="block text-sm font-bold text-ink-900">{title}</span>
      <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>
    </a>
  );
}
