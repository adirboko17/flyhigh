"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  matchCategoryName,
  sortCategoryNames,
} from "@/lib/admin/classCategories";
import {
  createManualIncome,
  deleteManualIncome,
  updateManualIncome,
} from "@/lib/finance/manualIncomeActions";
import type { ManualIncomeMode, ManualIncomeView } from "@/lib/finance/manualIncome";
import { formatCurrency } from "@/utils/format";

const EXTRA_CATEGORIES = ["בריכה", "שיעורים פרטיים", "מתנ״ס", "אחר"];
const NEW_CATEGORY = "__new__";

function categoryOptions(categories: string[], current?: string) {
  const names = [...categories, ...EXTRA_CATEGORIES];
  if (current) names.push(current);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name.trim());
  }
  return sortCategoryNames(unique);
}

export function ManualIncomesSection({
  month,
  monthTitle,
  items,
  categories,
}: {
  month: string;
  monthTitle: string;
  items: ManualIncomeView[];
  categories: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ManualIncomeView | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManualIncomeView | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">הכנסות נוספות</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            סכום קבוע לכל חודש, או הכנסה לחודש הזה בלבד.
          </p>
        </div>
        <Button type="button" onClick={() => setEditing("new")}>
          הוספת הכנסה
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-ink-500">
            אין הכנסות נוספות לחודש זה. אפשר להוסיף סכום קבוע או חד־פעמי.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <IncomeCube
              key={item.id}
              item={item}
              monthTitle={monthTitle}
              onEdit={() => setEditing(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      <IncomeEditor
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        month={month}
        monthTitle={monthTitle}
        item={editing && editing !== "new" ? editing : null}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <DeleteIncomeDialog
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

function IncomeCube({
  item,
  monthTitle,
  onEdit,
  onDelete,
}: {
  item: ManualIncomeView;
  monthTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hint =
    item.mode === "month"
      ? `הכנסה ל${monthTitle} בלבד.`
      : item.definedLater
        ? "הסכום מתחיל בחודש מאוחר יותר. שמירה כאן קובעת סכום מהחודש הזה."
        : item.amount <= 0
          ? "עדיין לא הוגדר סכום. אחרי השמירה הוא ימשיך לכל חודש."
          : item.isOwnEntry
            ? `עודכן ב${monthTitle} וממשיך לחודשים הבאים.`
            : "הסכום ממשיך מהעדכון האחרון.";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-ink-900">{item.name}</p>
              <Badge tone="brand">{item.category}</Badge>
              <Badge tone={item.mode === "month" ? "warning" : "info"}>
                {item.mode === "month" ? "לחודש זה" : "קבוע"}
              </Badge>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">
              {formatCurrency(item.amount)}
            </p>
            <p className="mt-1 text-sm text-ink-500">{hint}</p>
          </div>
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

function IncomeEditor({
  open,
  month,
  monthTitle,
  item,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  month: string;
  monthTitle: string;
  item: ManualIncomeView | null;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const options = useMemo(
    () => categoryOptions(categories, item?.category),
    [categories, item?.category]
  );
  const startingCategory = item ? (matchCategoryName(options, item.category) ?? NEW_CATEGORY) : "";
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(startingCategory);
  const [customCategory, setCustomCategory] = useState(
    startingCategory === NEW_CATEGORY ? (item?.category ?? "") : ""
  );
  const [amount, setAmount] = useState(item && item.amount ? String(item.amount) : "");
  const [mode, setMode] = useState<ManualIncomeMode>(item?.mode ?? "recurring");
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
    const chosen =
      category === NEW_CATEGORY
        ? customCategory
        : category;
    if (!chosen.trim()) {
      setError("יש לבחור קטגוריה.");
      return;
    }

    setSaving(true);
    setError(null);
    const result = item
      ? await updateManualIncome({
          id: item.id,
          name,
          category: chosen,
          amount: parsed,
          month,
          thisMonthOnly: item.mode === "recurring" && thisMonthOnly,
        })
      : await createManualIncome({
          name,
          category: chosen,
          amount: parsed,
          month,
          mode,
        });
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת ההכנסה נכשלה.");
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={item ? "עריכת הכנסה" : "הכנסה נוספת"}
      description={`${monthTitle} · הסכום נכנס לחישוב ההכנסות והרווח, ולסיכום של הקטגוריה.`}
    >
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="שם" required hint="למשל מתנ״ס או השכרת אולם">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="שם ההכנסה"
            disabled={saving}
            required
            maxLength={80}
          />
        </Field>

        <Field label="קטגוריה" required hint="הסכום יצטרף לסיכום של הקטגוריה הזו">
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={saving}
            required
          >
            <option value="">בחרו קטגוריה</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={NEW_CATEGORY}>קטגוריה אחרת</option>
          </Select>
        </Field>

        {category === NEW_CATEGORY && (
          <Field label="שם הקטגוריה" required>
            <Input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="למשל בריכה"
              disabled={saving}
              required
              maxLength={80}
            />
          </Field>
        )}

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
              ? "ההכנסה הזו חלה רק על החודש שבו נוצרה."
              : "ההכנסה קבועה וממשיכה לחודשים הבאים עד לעדכון."}
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
        name="income-mode"
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

function DeleteIncomeDialog({
  item,
  onClose,
  onDeleted,
}: {
  item: ManualIncomeView | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!item) return;
    setSaving(true);
    setError(null);
    const result = await deleteManualIncome({ id: item.id });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "מחיקת ההכנסה נכשלה.");
      return;
    }
    onDeleted();
  }

  return (
    <Modal
      open={item !== null}
      onClose={() => !saving && onClose()}
      title="מחיקת הכנסה"
      description={
        item
          ? item.mode === "month"
            ? `${item.name} תוסר מהחודש הזה.`
            : `${item.name} תוסר גם מהחודשים שאליהם הסכום ממשיך.`
          : undefined
      }
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
