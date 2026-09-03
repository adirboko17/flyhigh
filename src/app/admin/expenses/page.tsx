import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { BusinessExpensesPanel } from "@/components/admin/BusinessExpensesPanel";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import {
  monthLabel,
  monthOf,
  parseMonthParam,
  shiftMonth,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "הוצאות" };

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = todayInIsrael();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(monthParam, currentMonth);
  const monthTitle = monthLabel(month);

  const supabase = await createAdminDataClient();
  const [{ data: expenses }, { data: monthRows }] = await Promise.all([
    supabase
      .from("business_expenses")
      .select(
        "id, month, title, amount, file_name, file_path, file_size, mime_type, notes, created_at"
      )
      .eq("month", month)
      .order("created_at", { ascending: false }),
    supabase.from("business_expenses").select("month, amount"),
  ]);

  const monthCounts = new Map<string, number>();
  for (const row of monthRows ?? []) {
    monthCounts.set(row.month, (monthCounts.get(row.month) ?? 0) + 1);
  }
  const monthsWithExpenses = [...monthCounts.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 18);

  const monthExpenses = expenses ?? [];
  const totalAmount = monthExpenses.reduce(
    (sum, expense) => sum + (expense.amount == null ? 0 : Number(expense.amount)),
    0
  );
  const amountsCount = monthExpenses.filter((expense) => expense.amount != null).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="הוצאות"
        description={`קבלות וחשבוניות לפי חודש · ${monthTitle}`}
        action={
          <MonthSwitcher
            month={month}
            currentMonth={currentMonth}
            monthTitle={monthTitle}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="מסמכים החודש"
          value={monthExpenses.length}
          icon="📂"
          tone="brand"
          hint="מוכנים להורדה לרואה החשבון"
        />
        <StatCard
          label="סכום שמולא"
          value={formatCurrency(totalAmount)}
          icon="💸"
          tone="amber"
          hint={
            amountsCount === 0
              ? "אפשר למלא סכום בעת ההעלאה, זה לא חובה"
              : `${amountsCount} מתוך ${monthExpenses.length} מסמכים עם סכום`
          }
        />
      </div>

      {monthsWithExpenses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {monthsWithExpenses.map(([key, count]) => (
            <Link
              key={key}
              href={`/admin/expenses?month=${key}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                key === month
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-ink-50"
              )}
            >
              {monthLabel(key)}
              <span className="ms-1.5 font-medium opacity-80">{count}</span>
            </Link>
          ))}
        </div>
      )}

      <BusinessExpensesPanel
        month={month}
        monthTitle={monthTitle}
        expenses={monthExpenses}
      />
    </div>
  );
}

function MonthSwitcher({
  month,
  currentMonth,
  monthTitle,
}: {
  month: string;
  currentMonth: string;
  monthTitle: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-1.5 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-soft sm:w-auto sm:justify-start">
      <MonthArrow href={`/admin/expenses?month=${shiftMonth(month, -1)}`} label="החודש הקודם">
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </MonthArrow>
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-800 sm:min-w-[7.5rem] sm:flex-none">
        {monthTitle}
      </span>
      <MonthArrow href={`/admin/expenses?month=${shiftMonth(month, 1)}`} label="החודש הבא">
        <ChevronIcon className="h-4 w-4" />
      </MonthArrow>
      <Link
        href="/admin/expenses"
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
          month === currentMonth
            ? "bg-brand-50 text-brand-700"
            : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        )}
      >
        החודש
      </Link>
    </div>
  );
}

function MonthArrow({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
    >
      {children}
    </Link>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
