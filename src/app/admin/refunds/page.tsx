import { RefundsList, type RefundTransaction } from "@/components/admin/RefundsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAdminDataClient } from "@/lib/admin/dataClient";
import { subjectLabel } from "@/lib/finance/subject";
import { cn } from "@/utils/cn";
import {
  addDays,
  israelDateOf,
  monthLabel,
  monthOf,
  monthRange,
  parseMonthParam,
  shiftMonth,
  todayInIsrael,
} from "@/lib/scheduling/monthGrid";
import Link from "next/link";

export const metadata = { title: "זיכויים" };

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const today = todayInIsrael();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(monthParam, currentMonth);
  const { start: monthStart, end: monthEnd } = monthRange(month);
  const queryStart = addDays(monthStart, -1);
  const queryEnd = addDays(monthEnd, 1);
  const monthTitle = monthLabel(month);

  const supabase = await createAdminDataClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, status, paid_at, created_at, parent_id, external_reference, receipt_description, profiles(full_name, phone, email), enrollments(type, children(full_name), classes(title), programs(title), pool_passes(title), private_lessons(title)), payment_checkouts(transaction_id), payment_refunds(id, amount, created_at, note, document_number, document_url, sent_to_email)"
    )
    .eq("payment_method", "credit_card")
    .in("status", ["paid", "refunded", "partial"])
    .or(
      `and(paid_at.gte.${queryStart}T00:00:00,paid_at.lte.${queryEnd}T23:59:59),and(paid_at.is.null,created_at.gte.${queryStart}T00:00:00,created_at.lte.${queryEnd}T23:59:59)`
    )
    .order("paid_at", { ascending: false, nullsFirst: false });

  const transactions: RefundTransaction[] = (payments ?? [])
    .map((payment) => {
      const cardcomReference =
        payment.external_reference?.trim() ||
        payment.payment_checkouts?.transaction_id?.trim() ||
        null;
      const refunds = [...(payment.payment_refunds ?? [])]
        .map((refund) => ({
          id: refund.id,
          amount: Number(refund.amount),
          createdAt: refund.created_at,
          note: refund.note,
          documentNumber: refund.document_number,
          documentUrl: refund.document_url,
          sentToEmail: refund.sent_to_email,
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      const refundedAmount = round2(
        refunds.reduce((sum, refund) => sum + refund.amount, 0)
      );
      const amount = Number(payment.amount);
      const occurredAt = payment.paid_at ?? payment.created_at;

      return {
        id: payment.id,
        amount,
        refundedAmount,
        remaining: round2(Math.max(0, amount - refundedAmount)),
        status: payment.status,
        paidAt: payment.paid_at,
        createdAt: payment.created_at,
        cardcomReference,
        parentName: payment.profiles?.full_name ?? "לקוח לא ידוע",
        phone: payment.profiles?.phone ?? null,
        email: payment.profiles?.email ?? null,
        subject:
          payment.receipt_description?.trim() ||
          subjectLabel(payment.enrollments),
        childName: payment.enrollments?.children?.full_name ?? null,
        refunds,
        occurredAt,
      };
    })
    .filter((payment) => israelDateOf(payment.occurredAt).startsWith(month))
    .filter((payment) => Boolean(payment.cardcomReference));

  return (
    <div className="space-y-6">
      <PageHeader
        title="זיכויים"
        description={`עסקאות אשראי שנסלקו · ${monthTitle}`}
        action={
          <MonthSwitcher
            month={month}
            currentMonth={currentMonth}
            monthTitle={monthTitle}
          />
        }
      />
      <RefundsList transactions={transactions} monthTitle={monthTitle} />
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
      <MonthArrow
        href={`/admin/refunds?month=${shiftMonth(month, -1)}`}
        label="החודש הקודם"
      >
        <ChevronIcon className="h-4 w-4 rotate-180" />
      </MonthArrow>
      <span className="min-w-0 flex-1 text-center text-sm font-semibold text-ink-800 sm:min-w-[7.5rem] sm:flex-none">
        {monthTitle}
      </span>
      <MonthArrow
        href={`/admin/refunds?month=${shiftMonth(month, 1)}`}
        label="החודש הבא"
      >
        <ChevronIcon className="h-4 w-4" />
      </MonthArrow>
      <Link
        href="/admin/refunds"
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
