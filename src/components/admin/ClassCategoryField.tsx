"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import {
  addClassCategory,
  matchCategoryName,
  sortCategoryNames,
} from "@/lib/admin/classCategories";
import { createClient } from "@/lib/supabase/client";

export function ClassCategoryField({
  value,
  categories,
  onChange,
  onCategoryAdded,
  disabled,
}: {
  value: string;
  categories: string[];
  onChange: (name: string) => void;
  onCategoryAdded: (name: string) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(categories.length === 0);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => {
    const names = [...categories];
    if (value && !matchCategoryName(names, value)) {
      names.push(value);
    }
    return sortCategoryNames(names);
  }, [categories, value]);

  async function handleAdd() {
    const existing = matchCategoryName(options, newName);
    if (existing) {
      onChange(existing);
      setNewName("");
      setAdding(false);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    const result = await addClassCategory(createClient(), newName);
    setSaving(false);

    if (result.error || !result.name) {
      setError(result.error ?? "לא הצלחנו להוסיף את הקטגוריה. נסו שוב.");
      return;
    }

    onCategoryAdded(result.name);
    onChange(result.name);
    setNewName("");
    setAdding(false);
  }

  return (
    <Field
      label="קטגוריה"
      htmlFor="class-category"
      hint="בחרו מהרשימה כדי שחוגים מאותו סוג — למשל שחייה — יתקבצו יחד בהכנסות בעמוד הכספים."
      error={error ?? undefined}
    >
      <Select
        id="class-category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || saving}
      >
        <option value="">ללא קטגוריה</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>

      {adding ? (
        <div className="space-y-2 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="למשל: שחייה"
              disabled={disabled || saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleAdd()}
                disabled={disabled || saving || !newName.trim()}
              >
                {saving ? "מוסיף..." : "הוספה"}
              </Button>
              {options.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setNewName("");
                    setError(null);
                  }}
                  disabled={disabled || saving}
                >
                  ביטול
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={disabled}
          className="pt-1 text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          + קטגוריה חדשה
        </button>
      )}
    </Field>
  );
}
