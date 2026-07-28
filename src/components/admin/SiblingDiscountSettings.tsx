"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SiblingDiscountEditor } from "@/components/admin/SiblingDiscountEditor";
import { saveDefaultSiblingDiscount } from "@/lib/admin/settingsActions";
import type { SiblingDiscountTier } from "@/lib/finance/siblingDiscount";

export function SiblingDiscountSettings({
  initialTiers,
}: {
  initialTiers: SiblingDiscountTier[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await saveDefaultSiblingDiscount(tiers);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "שמירת ההנחה נכשלה.");
      return;
    }

    setMessage("ההנחה נשמרה.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>הנחת אחים — ברירת מחדל</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-500">
          ההנחה חלה על כל ההזמנה כשמשפחה רושמת כמה ילדים לאותו חוג. חוג יכול
          להגדיר מדרגות משלו ולעקוף את ברירת המחדל.
        </p>

        <SiblingDiscountEditor
          tiers={tiers}
          onChange={(next) => {
            setTiers(next);
            setMessage(null);
          }}
          disabled={saving}
        />

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

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "שומר..." : "שמירת ההנחה"}
        </Button>
      </CardContent>
    </Card>
  );
}
