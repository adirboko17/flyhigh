"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SiblingDiscountEditor } from "@/components/admin/SiblingDiscountEditor";
import { saveDefaultSiblingDiscount } from "@/lib/admin/settingsActions";
import {
  FAMILY_DISCOUNT_PRODUCT_TYPES,
  resolveSelectedCategories,
  type FamilyDiscountProductType,
  type FamilyDiscountSettings,
} from "@/lib/finance/siblingDiscount";
import { cn } from "@/utils/cn";

export function SiblingDiscountForm({
  initialSettings,
  categories,
  onSuccess,
  onCancel,
}: {
  initialSettings: FamilyDiscountSettings;
  categories: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initialSettings.tiers);
  const [classCategories, setClassCategories] = useState(() =>
    resolveSelectedCategories(initialSettings.classCategories, categories)
  );
  const [productTypes, setProductTypes] = useState(
    initialSettings.productTypes
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(name: string) {
    setClassCategories((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
    setMessage(null);
  }

  function toggleProduct(id: FamilyDiscountProductType) {
    setProductTypes((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await saveDefaultSiblingDiscount({
      tiers,
      classCategories,
      productTypes,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת ההנחה נכשלה.");
      return;
    }

    setMessage("ההנחה נשמרה.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <div className="space-y-5">
      <SiblingDiscountEditor
        tiers={tiers}
        onChange={(next) => {
          setTiers(next);
          setMessage(null);
        }}
        disabled={saving}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-800">
          קטגוריות חוגים
        </legend>
        <p className="text-xs text-ink-500">
          ההנחה תחול על כל החוגים בקטגוריות שנבחרו.
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-400">אין קטגוריות חוגים עדיין.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((name) => {
              const selected = classCategories.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  disabled={saving}
                  onClick={() => toggleCategory(name)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-800"
                      : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-800">
          מוצרים נוספים
        </legend>
        <p className="text-xs text-ink-500">
          בנוסף לחוגים, אפשר להחיל את אותה הנחה על כרטיסים, מנויים ושיעורים.
        </p>
        <div className="flex flex-wrap gap-2">
          {FAMILY_DISCOUNT_PRODUCT_TYPES.map((item) => {
            const selected = productTypes.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={saving}
                onClick={() => toggleProduct(item.id)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm font-medium text-aqua-700" role="status">
          {message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "שומר..." : "שמירת ההנחה"}
        </Button>
        {onCancel && !saving && (
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
        )}
      </div>
    </div>
  );
}
