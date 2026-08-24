"use client";

import { useEffect, useState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  HEALTH_DECLARATION_MANAGER,
  hebrewSchoolYearLabel,
  isValidIdNumber,
  normalizeIdNumber,
  type HealthDeclarationDraft,
} from "@/lib/health-declaration";
import { formatDate } from "@/utils/format";

export function HealthDeclarationModal({
  open,
  onClose,
  childName,
  today,
  schoolYear,
  initial,
  readOnly = false,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  childName: string;
  today: string;
  schoolYear: number;
  initial?: HealthDeclarationDraft | null;
  readOnly?: boolean;
  onSave?: (draft: HealthDeclarationDraft) => void | Promise<void | boolean>;
}) {
  const [idNumber, setIdNumber] = useState(initial?.idNumber ?? "");
  const [accepted, setAccepted] = useState(initial?.accepted ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdNumber(initial?.idNumber ?? "");
    setAccepted(initial?.accepted ?? readOnly);
    setError(null);
  }, [open, initial, readOnly]);

  const hebrewYear = hebrewSchoolYearLabel(schoolYear);
  const displayName = childName.trim() || "—";
  const displayId = normalizeIdNumber(idNumber) || "—";
  const signedAt = initial?.signedAt || today;

  async function handleSave() {
    const digits = normalizeIdNumber(idNumber);
    if (!childName.trim()) {
      setError("יש למלא קודם את שם הילד/ה.");
      return;
    }
    if (!isValidIdNumber(digits)) {
      setError("נא למלא מספר ת.ז. תקין (5–9 ספרות).");
      return;
    }
    if (!accepted) {
      setError("יש לאשר את הצהרת הבריאות.");
      return;
    }
    setSaving(true);
    const result = await onSave?.({
      idNumber: digits,
      accepted: true,
      signedAt: today,
    });
    setSaving(false);
    if (result === false) {
      setError("שמירת הצהרת הבריאות נכשלה. נסו שוב.");
      return;
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="הצהרת בריאות"
      description={`לשנת ${hebrewYear}`}
    >
      <div className="space-y-4 text-sm leading-relaxed text-ink-700">
        <p>
          הנני מצהיר/ה שלי הרשומה לחוג לשנת {hebrewYear} או לילדי הרשום בחוג,
          שם{" "}
          <span className="font-bold text-ink-900 underline decoration-ink-300 underline-offset-4">
            {displayName}
          </span>{" "}
          ת.ז.{" "}
          <span
            dir="ltr"
            className="font-bold text-ink-900 underline decoration-ink-300 underline-offset-4"
          >
            {displayId}
          </span>
          , אין כל בעיה רפואית ומותר לו לבצע את הפעילות הגופנית הנדרשת. על כל
          שינוי במצב הבריאותי מחובתי לעדכן את מעבירה החוג והמנהלת{" "}
          {HEALTH_DECLARATION_MANAGER}.
        </p>

        {!readOnly && (
          <Field label="ת.ז. של הילד/ה" htmlFor="healthIdNumber" required variant="ds">
            <Input
              id="healthIdNumber"
              variant="ds"
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123456789"
              value={idNumber}
              onChange={(e) => setIdNumber(normalizeIdNumber(e.target.value).slice(0, 9))}
            />
          </Field>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3">
          <span className="text-sm font-medium text-ink-600">תאריך</span>
          <span className="font-semibold text-ink-900">{formatDate(signedAt)}</span>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3">
          <input
            type="checkbox"
            checked={accepted}
            disabled={readOnly}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-400 disabled:opacity-70"
          />
          <span className="text-sm font-medium text-ink-800">
            אני מאשר/ת את הצהרת הבריאות
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {readOnly ? (
          <button
            type="button"
            onClick={onClose}
            className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block"
          >
            סגירה
          </button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="hero-cta-primary ah-btn ah-btn--lg ah-btn--block sm:flex-[1.4]"
            >
              {saving ? "שומר..." : "שמירת הצהרה"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ah-btn ah-btn--lg ah-btn--outline ah-btn--block sm:flex-1"
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
