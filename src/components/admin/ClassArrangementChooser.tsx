"use client";

import { Icon } from "@/components/icons/Icon";
import { Modal } from "@/components/ui/Modal";

export function ClassArrangementChooser({
  onClose,
  onPickFeatured,
  onPickCatalog,
}: {
  onClose: () => void;
  onPickFeatured: () => void;
  onPickCatalog: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="סידור חוגים"
      description="בחרו מה לסדר — בדף הבית או בעמוד החוגים."
      className="max-w-lg"
    >
      <div className="grid gap-3">
        <ChoiceCard
          icon="badge"
          title="חוגים מובילים"
          hint="עד 3 חוגים שיוצגו בדף הבית, לפי הסדר שתבחרו."
          onClick={onPickFeatured}
        />
        <ChoiceCard
          icon="week"
          title="סדר בעמוד החוגים"
          hint="אותו מראה כמו באתר. קובעים איזה חוג למעלה ואיזה למטה."
          onClick={onPickCatalog}
        />
      </div>
    </Modal>
  );
}

function ChoiceCard({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: "badge" | "week";
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-4 text-right transition-colors hover:border-brand-200 hover:bg-brand-50/50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-ink-900">{title}</span>
        <span className="mt-1 block text-sm text-ink-500">{hint}</span>
      </span>
      <Icon name="chevron" size={18} className="mt-2 shrink-0 text-ink-300" />
    </button>
  );
}
