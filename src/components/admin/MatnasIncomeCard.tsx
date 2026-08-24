"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { saveMatnasIncome } from "@/lib/finance/matnasIncomeActions";
import { formatCurrency } from "@/utils/format";

export function MatnasIncomeCard({
  month,
  monthTitle,
  amount,
  isOwnEntry,
}: {
  month: string;
  monthTitle: string;
  amount: number;
  isOwnEntry: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(amount ? String(amount) : "");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setValue(amount ? String(amount) : "");
    setThisMonthOnly(false);
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("יש להזין סכום תקין.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await saveMatnasIncome({
      month,
      amount: parsed,
      thisMonthOnly,
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת הסכום נכשלה.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  const hint =
    amount <= 0
      ? "עדיין לא הוגדר סכום קבוע. אחרי השמירה הוא ימשיך לכל חודש."
      : isOwnEntry
        ? `עודכן ב${monthTitle} וממשיך לחודשים הבאים עד לעדכון הבא.`
        : "הסכום ממשיך מהעדכון האחרון. אפשר לשנות לחודש זה בלבד או מחודש זה והלאה.";

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-500">הכנסה קבועה מהמתנ״ס</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
              {formatCurrency(amount)}
            </p>
            <p className="mt-1 text-sm text-ink-500">{hint}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={openEditor}
          >
            {amount > 0 ? "עדכון סכום" : "הגדרת סכום"}
          </Button>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="הכנסה מהמתנ״ס"
        description={`${monthTitle} · הסכום נשמר בנפרד מהתשלומים ונכנס לחישוב הרווח.`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="סכום לחודש" required hint="בשקלים">
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              disabled={saving}
              required
            />
          </Field>

          {amount > 0 && (
            <label className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/70 px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-brand-600"
                checked={thisMonthOnly}
                onChange={(e) => setThisMonthOnly(e.target.checked)}
                disabled={saving}
              />
              <span>
                <span className="font-semibold text-ink-800">רק לחודש זה</span>
                <span className="mt-0.5 block text-ink-500">
                  החודשים הבאים יישארו {formatCurrency(amount)}. בלי הסימון הסכום
                  החדש ימשיך לכל חודש עד לעדכון הבא.
                </span>
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "שומר..." : "שמירה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
