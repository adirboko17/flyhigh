"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import {
  addManualCustomerBalance,
  loadCustomerBalanceEntries,
  type CustomerBalanceEntry,
} from "@/lib/admin/customerBalanceActions";
import { formatCurrency, formatDate } from "@/utils/format";

function entryLabel(kind: string) {
  if (kind === "grant") return "הוספה";
  if (kind === "spend") return "שימוש ברכישה";
  if (kind === "reversal") return "ביטול";
  return "תנועה";
}

export function CustomerStoreBalanceCard({
  parentId,
  parentName,
  balance,
}: {
  parentId: string;
  parentName: string;
  balance: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shownBalance, setShownBalance] = useState(balance);
  const [entries, setEntries] = useState<CustomerBalanceEntry[] | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    setAmount("");
    setNote("");
    setError(null);
    setSaved(false);
  }, [parentId]);

  useEffect(() => {
    setShownBalance(balance);
  }, [parentId, balance]);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    loadCustomerBalanceEntries(parentId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, historyKey]);

  async function submit() {
    const trimmed = amount.trim().replace(/₪/g, "").replace(/\s/g, "");
    const normalized = trimmed.includes(".")
      ? trimmed.replace(/,/g, "")
      : trimmed.replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
      setError("נא להזין סכום חיובי, עד שתי ספרות אחרי הנקודה.");
      setSaved(false);
      return;
    }
    if (
      !window.confirm(
        `להוסיף ${formatCurrency(Number(normalized))} ליתרה של ${parentName}? הלקוח יוכל להשתמש בסכום ברכישה באתר.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await addManualCustomerBalance({
      parentId,
      amount: normalized,
      note,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAmount("");
    setNote("");
    setShownBalance(result.balance);
    setHistoryKey((current) => current + 1);
    setSaved(true);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">יתרה באתר</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div>
          <p className="font-display text-2xl font-bold tabular-nums text-ink-900">
            {formatCurrency(shownBalance)}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            הלקוח יכול להשתמש ביתרה ברכישה באתר. היא יורדת מהסכום, ואת מה שנשאר
            משלמים באמצעי שהוא בוחר. הוספה ידנית לא מפיקה חשבונית ולא רושמת תשלום.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-ink-200 bg-ink-50/70 p-3">
          <Field label="סכום להוספה" htmlFor={`balance-amount-${parentId}`} required>
            <Input
              id={`balance-amount-${parentId}`}
              inputMode="decimal"
              dir="ltr"
              value={amount}
              placeholder="0"
              onChange={(event) => {
                setAmount(event.target.value);
                setSaved(false);
              }}
            />
          </Field>
          <Field
            label="הערה"
            htmlFor={`balance-note-${parentId}`}
            hint="לא חובה. נשמרת רק לצוות, כדי שיהיה ברור למה ניתנה היתרה."
          >
            <Textarea
              id={`balance-note-${parentId}`}
              rows={2}
              value={note}
              placeholder="לדוגמה: פיצוי על ביטול שיעור"
              onChange={(event) => {
                setNote(event.target.value);
                setSaved(false);
              }}
            />
          </Field>
          {error && (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-500">
              {saved ? "היתרה נוספה ללקוח" : "הסכום יתווסף ליתרה הקיימת"}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => void submit()}
              disabled={saving || !amount.trim()}
            >
              {saving ? "מוסיף..." : "הוספת יתרה"}
            </Button>
          </div>
        </div>

        {entries && entries.length > 0 && (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-800">{entryLabel(entry.kind)}</p>
                  <p className="text-xs text-ink-500">
                    {formatDate(entry.createdAt)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-semibold tabular-nums ${
                    entry.amount > 0 ? "text-emerald-700" : "text-ink-700"
                  }`}
                >
                  {formatCurrency(entry.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
