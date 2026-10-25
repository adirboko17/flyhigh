"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  createManualExpense,
  deleteManualExpense,
  updateManualExpense,
} from "@/lib/finance/manualExpenseActions";
import type { ManualExpenseMode, ManualExpenseView } from "@/lib/finance/manualExpense";
import { formatCurrency } from "@/utils/format";

export function ManualExpensesSection({
  month,
  monthTitle,
  items,
}: {
  month: string;
  monthTitle: string;
  items: ManualExpenseView[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ManualExpenseView | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManualExpenseView | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">הוצאות נוספות</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            סכום קבוע לכל חודש, או הוצאה לחודש הזה בלבד. נכנס להשוואה מול ההכנסות.
          </p>
        </div>
        <Button type="button" onClick={() => setEditing("new")}>
          הוספת הוצאה
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-ink-500">
            אין הוצאות נוספות לחודש זה. אפשר להוסיף סכום קבוע או חד־פעמי.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ExpenseCube
              key={item.id}
              item={item}
              monthTitle={monthTitle}
              onEdit={() => setEditing(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      <ExpenseEditor
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        month={month}
        monthTitle={monthTitle}
        item={editing && editing !== "new" ? editing : null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <DeleteExpenseDialog
        key={pendingDelete?.id ?? "closed"}
        item={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onDeleted={() => {
          setPendingDelete(null);
          router.refresh();
        }}
      />
    </section>
  );
}

function expenseHint(item: ManualExpenseView, monthTitle: string) {
  if (item.mode === "month") return `הוצאה ל${monthTitle} בלבד.`;
  if (item.definedLater) {
    return "הסכום מתחיל בחודש מאוחר יותר. שמירה כאן קובעת סכום מהחודש הזה.";
  }
  if (item.amount <= 0) {
    return "עדיין לא הוגדר סכום. אחרי השמירה הוא ימשיך לכל חודש.";
  }
  if (item.isOwnEntry) return `עודכן ב${monthTitle} וממשיך לחודשים הבאים.`;
  return "הסכום ממשיך מהעדכון האחרון.";
}

function ExpenseCube({
  item,
  monthTitle,
  onEdit,
  onDelete,
}: {
  item: ManualExpenseView;
  monthTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-ink-900">{item.name}</p>
            <Badge tone={item.mode === "month" ? "warning" : "info"}>
              {item.mode === "month" ? "לחודש זה" : "קבוע"}
            </Badge>
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">
            {formatCurrency(item.amount)}
          </p>
          <p className="mt-1 text-sm text-ink-500">{expenseHint(item, monthTitle)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            עריכה
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            מחיקה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseEditor({
  open,
  month,
  monthTitle,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  month: string;
  monthTitle: string;
  item: ManualExpenseView | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [mode, setMode] = useState<ManualExpenseMode>(item?.mode ?? "recurring");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("יש להזין סכום תקין.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = item
      ? await updateManualExpense({
          id: item.id,
          name,
          amount: parsed,
          month,
          thisMonthOnly: item.mode === "recurring" && thisMonthOnly,
        })
      : await createManualExpense({
          name,
          amount: parsed,
          month,
          mode,
        });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת ההוצאה נכשלה.");
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={item ? "עריכת הוצאה" : "הוצאה נוספת"}
      description={`${monthTitle} · הסכום יורד מהרווח ומופיע בהשוואה מול ההכנסות.`}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="שם" required hint="למשל שכירות או חשמל">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="שם ההוצאה"
            disabled={saving}
            required
            maxLength={80}
          />
        </Field>

        <Field label="סכום לחודש" required hint="בשקלים">
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            disabled={saving}
            required
          />
        </Field>

        {item ? (
          <p className="text-sm text-ink-500">
            {item.mode === "month"
              ? "ההוצאה הזו חלה רק על החודש שבו נוצרה."
              : "ההוצאה קבועה וממשיכה לחודשים הבאים עד לעדכון."}
          </p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink-700">מתי הסכום חל</legend>
            <ModeOption
              checked={mode === "recurring"}
              disabled={saving}
              title="קבוע מהחודש הזה והלאה"
              description="הסכום ייכנס בכל חודש עד שתעדכנו אותו."
              onChange={() => setMode("recurring")}
            />
            <ModeOption
              checked={mode === "month"}
              disabled={saving}
              title="רק לחודש זה"
              description="הסכום יופיע רק בחודש שפתוח עכשיו."
              onChange={() => setMode("month")}
            />
          </fieldset>
        )}

        {item && item.mode === "recurring" && item.amount > 0 && (
          <label className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/70 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-brand-600"
              checked={thisMonthOnly}
              onChange={(event) => setThisMonthOnly(event.target.checked)}
              disabled={saving}
            />
            <span>
              <span className="font-semibold text-ink-800">רק לחודש זה</span>
              <span className="mt-0.5 block text-ink-500">
                החודשים הבאים יישארו {formatCurrency(item.amount)}. בלי הסימון הסכום
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
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ModeOption({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-ink-100 px-4 py-3 text-sm">
      <input
        type="radio"
        name="expense-mode"
        className="mt-0.5 h-4 w-4 accent-brand-600"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>
        <span className="font-semibold text-ink-800">{title}</span>
        <span className="mt-0.5 block text-ink-500">{description}</span>
      </span>
    </label>
  );
}

function DeleteExpenseDialog({
  item,
  onClose,
  onDeleted,
}: {
  item: ManualExpenseView | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    setSaving(true);
    setError(null);
    const result = await deleteManualExpense({ id: item.id });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "מחיקת ההוצאה נכשלה.");
      return;
    }
    onDeleted();
  }

  return (
    <Modal
      open={item !== null}
      onClose={() => !saving && onClose()}
      title="מחיקת הוצאה"
      description={item ? `למחוק את «${item.name}» מכל החודשים?` : undefined}
    >
      {error && (
        <p className="mb-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
          ביטול
        </Button>
        <Button type="button" variant="danger" disabled={saving} onClick={handleDelete}>
          {saving ? "מוחק..." : "מחיקה"}
        </Button>
      </div>
    </Modal>
  );
}
