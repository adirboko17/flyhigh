import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { FinanceBreakdownRow } from "@/lib/finance/report";
import { formatCurrency } from "@/utils/format";

export function IncomeCategoryBoard({ rows }: { rows: FinanceBreakdownRow[] }) {
  const visible = rows.filter((row) => row.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>הכנסות לפי קטגוריה</CardTitle>
        <span className="text-xs text-ink-400">סיכום בלי פירוט עסקאות</span>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-ink-500">אין הכנסות בחודש הזה.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((row) => (
              <div
                key={row.key}
                className="rounded-2xl border border-ink-100 bg-ink-50/70 px-4 py-3"
              >
                <p className="truncate text-sm font-medium text-ink-500">{row.label}</p>
                <p className="mt-1 font-display text-xl font-extrabold text-ink-900">
                  {formatCurrency(row.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
