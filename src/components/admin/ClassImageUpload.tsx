"use client";

import { useRef } from "react";
import { Field } from "@/components/ui/Input";
import { validateClassImageFile } from "@/lib/storage/classImage";

interface Props {
  displayUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onValidationError: (message: string) => void;
  disabled?: boolean;
}

export function ClassImageUpload({
  displayUrl,
  onFileSelect,
  onClear,
  onValidationError,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateClassImageFile(file);
    if (validationError) {
      onValidationError(validationError);
      e.target.value = "";
      return;
    }

    onFileSelect(file);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  return (
    <Field label="תמונת החוג">
      <div className="space-y-3">
        {displayUrl ? (
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="תצוגה מקדימה של תמונת החוג"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="absolute start-3 top-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition hover:bg-white disabled:opacity-50"
            >
              הסרת תמונה
            </button>
          </div>
        ) : (
          <label
            className={`flex aspect-[2/1] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 px-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40 ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            <span className="text-3xl">📷</span>
            <span className="mt-3 text-sm font-semibold text-ink-800">
              לחצו להעלאת תמונה
            </span>
            <span className="mt-1 text-xs text-ink-500">
              JPG, PNG, WebP או GIF · עד 5MB
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleChange}
              disabled={disabled}
              className="sr-only"
            />
          </label>
        )}

        {displayUrl && (
          <label className="inline-block cursor-pointer text-sm font-medium text-brand-600 hover:underline">
            החלפת תמונה
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleChange}
              disabled={disabled}
              className="sr-only"
            />
          </label>
        )}
      </div>
    </Field>
  );
}
